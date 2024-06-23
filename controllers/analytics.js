require('dotenv').config();
propertyId = process.env.VIEW_ID

// Imports the Google Analytics Data API client library.
const {BetaAnalyticsDataClient} = require('@google-analytics/data');

// Using a default constructor instructs the client to use the credentials
// specified in GOOGLE_APPLICATION_CREDENTIALS environment variable.
const analyticsDataClient = new BetaAnalyticsDataClient();

module.exports = {
	analyticsDataClient, // Adicionando o cliente do Analytics ao export
	propertyId,
};