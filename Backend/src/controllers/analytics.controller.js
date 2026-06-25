const analyticsService = require('../services/analytics.service');

async function getAnalytics(req, res) {
    try {
        const userId = req.user._id;
        const analytics = await analyticsService.getStorageAnalytics(userId);
        res.status(200).json(analytics);
    } catch (err) {
        console.error("[Analytics Error]:", err);
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
}

module.exports = {
    getAnalytics
};
