const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

//  Your API route
app.post("/api/check", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "No username provided" });

    const encodedUsername = encodeURIComponent(username);

    // --- X API
    const xUrl = `https://api.x.com/graphql/IGgvgiOx4QZndDHuD3x9TQ/UserByScreenName?variables=%7B%22screen_name%22%3A%22${encodedUsername}%22%2C%22withGrokTranslatedBio%22%3Afalse%7D&features=%7B%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%7D`;

    const xRes = await fetch(xUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
        Authorization: "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
        "X-Twitter-Active-User": "yes"
      }
    });

    const xJson = await xRes.json();
    const user = xJson?.data?.user?.result;
    const profileData = {
      name: user?.core?.name || null,
      screen_name: user?.core?.screen_name || null,
      description: user?.legacy?.description || null,
      followers_count: user?.legacy?.followers_count || 0,
      friends_count: user?.legacy?.friends_count || 0
    };

    // --- Shadowban API
    const sbUrl = `https://shadowban-api.yuzurisa.com:444/${encodedUsername}`;
    const sbRes = await fetch(sbUrl);
    const sbJson = await sbRes.json();
    const profile = sbJson?.profile || {};
    const tests = sbJson?.tests || {};

    const finalResponse = {
      about_profile: {
        exists: profile.exists ?? false,
        protected: profile.protected ?? false,
        suspended: profile.suspended ?? false,
        name: profileData.name,
        screen_name: profileData.screen_name,
        description: profileData.description,
        followers_count: profileData.followers_count,
        friends_count: profileData.friends_count
      },
      tests: {
        search: tests.search ?? null,
        typeahead: tests.typeahead ?? false
      },
      ghostban: {
        ban: tests?.ghost?.ban ?? null
      },
      more_replies: {
        ban: tests?.more_replies?.ban ?? null
      }
    };

    res.json(finalResponse);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Request failed" });
  }
});

// --- Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});