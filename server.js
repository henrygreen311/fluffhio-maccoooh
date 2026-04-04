const express = require("express");
const fetch = require("node-fetch"); // npm install node-fetch@2
const app = express();
const PORT = 444;

// Helper function to extract the X API profile data
function extractProfileData(xData) {
  const user = xData?.data?.user?.result;
  const legacy = user?.legacy || {};

  return {
    name: user?.core?.name || null,
    screen_name: user?.core?.screen_name || null,
    description: legacy?.description || null,
    followers_count: legacy?.followers_count || 0,
    friends_count: legacy?.friends_count || 0,
    exists: !!user,
    protected: user?.privacy?.protected ?? null,
    suspended: null // X API does not directly return suspension, default null
  };
}

// Helper function to extract shadowban tests
function extractShadowbanData(shadowData) {
  return {
    search: shadowData?.tests?.search || null,
    typeahead: shadowData?.tests?.typeahead || false,
    ghostban: {
      ban: shadowData?.tests?.ghost?.ban ?? null
    },
    more_replies: {
      ban: shadowData?.tests?.more_replies?.ban ?? null
    }
  };
}

app.get("/:username", async (req, res) => {
  const username = req.params.username;

  try {
    // 1️⃣ Fetch X API data
    const xUrl = `https://api.x.com/graphql/IGgvgiOx4QZndDHuD3x9TQ/UserByScreenName?variables=${encodeURIComponent(
      JSON.stringify({ screen_name: username, withGrokTranslatedBio: false })
    )}&features=${encodeURIComponent(
      JSON.stringify({ responsive_web_graphql_timeline_navigation_enabled: true })
    )}`;

    const xRes = await fetch(xUrl, {
      headers: {
        "Authorization": "Bearer YOUR_BEARER_TOKEN",
        "User-Agent": "Mozilla/5.0",
        Accept: "*/*",
        "Content-Type": "application/json",
      },
    });

    const xData = await xRes.json();
    const profileData = extractProfileData(xData);

    // 2️⃣ Fetch shadowban API
    const shadowUrl = `https://shadowban-api.yuzurisa.com:444/${username}`;
    const shadowRes = await fetch(shadowUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "*/*",
      },
    });

    const shadowData = await shadowRes.json();
    const testsData = extractShadowbanData(shadowData);

    // 3️⃣ Combine for frontend
    const finalResponse = {
      "about_profile": profileData,
      "tests": testsData
    };

    res.json(finalResponse);
  } catch (err) {
    console.error("❌ Error fetching data:", err);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));