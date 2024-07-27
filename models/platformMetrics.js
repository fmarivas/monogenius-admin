require('dotenv').config()
const {conn} = require('./db')
const { v4: uuidv4 } = require('uuid');
const { analyticsDataClient, propertyId } = require('../controllers/analytics');
const moment =require('moment')
const util = require('util');

// Promisify the query method
const query = util.promisify(conn.query).bind(conn);

class data {
	static formatDate(date){
		if (date === '30daysAgo') {
		  return moment().subtract(30, 'days').format('YYYY-MM-DD');
		} else if (date === 'today') {
		  return moment().format('YYYY-MM-DD');
		} else if (moment(date, 'YYYY-MM-DD', true).isValid()) {
		  return date;
		} else {
		  throw new Error(`Data inválida: ${date}. Use o formato 'YYYY-MM-DD' ou '30daysAgo' ou 'today'.`);
		}
	};	
	

	static async getTotalUsers() {
		try{
			const sql = 'SELECT * FROM users';
			const results = await query(sql)
			return results
		}catch(err){
			console.error(err)
			throw new Error('Failed to get users metrics');
		}
	}
	

	static async getRevenue(startDate, endDate) {
		const start = this.formatDate(startDate);
		const end = this.formatDate(endDate);
		try {
			const sql = `
				SELECT 
					DATE(transaction_date) as date,
					SUM(amount) as daily_revenue,
					COUNT(*) as transaction_count,
					tier
				FROM 
					transactions
				WHERE 
					transaction_date BETWEEN ? AND ?
					AND status = 'completed'
				GROUP BY 
					DATE(transaction_date), tier
				ORDER BY 
					date ASC
			`;
			
			const results = await query(sql, [start, end]);
			
			if (results.length === 0) {
				// Retornar dados padrão se não houver resultados
				return {
					revenueData: [],
					summary: {
						totalRevenue: 0,
						averageDailyRevenue: 0,
						totalTransactions: 0,
						startDate: start,
						endDate: end,
						periodDays: moment(end).diff(moment(start), 'days') + 1,
						growth: 0,
						topSources: []
					}
				};
			}

			const revenueData = results.reduce((acc, row) => {
				const date = moment(row.date).format('YYYY-MM-DD');
				if (!acc[date]) {
					acc[date] = {
						date,
						dailyRevenue: 0,
						transactionCount: 0,
						tiers: {}
					};
				}
				acc[date].dailyRevenue += parseFloat(row.daily_revenue);
				acc[date].transactionCount += row.transaction_count;
				acc[date].tiers[row.tier] = (acc[date].tiers[row.tier] || 0) + parseFloat(row.daily_revenue);
				return acc;
			}, {});

			const revenueArray = Object.values(revenueData);
			const totalRevenue = revenueArray.reduce((sum, day) => sum + day.dailyRevenue, 0);
			const averageDailyRevenue = totalRevenue / revenueArray.length;
			const totalTransactions = revenueArray.reduce((sum, day) => sum + day.transactionCount, 0);
			
			// Calcular crescimento
			const firstDayRevenue = revenueArray[0].dailyRevenue;
			const lastDayRevenue = revenueArray[revenueArray.length - 1].dailyRevenue;
			const growth = firstDayRevenue !== 0 ? ((lastDayRevenue - firstDayRevenue) / firstDayRevenue) * 100 : 0;

			// Calcular principais fontes
			const tierTotals = revenueArray.reduce((acc, day) => {
				Object.entries(day.tiers).forEach(([tier, amount]) => {
					acc[tier] = (acc[tier] || 0) + amount;
				});
				return acc;
			}, {});

			const topSources = Object.entries(tierTotals)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 3)
				.map(([tier, amount]) => ({
					tier,
					amount,
					percentage: totalRevenue !== 0 ? (amount / totalRevenue) * 100 : 0
				}));

			return {
				revenueData: revenueArray,
				summary: {
					totalRevenue,
					averageDailyRevenue,
					totalTransactions,
					startDate: start,
					endDate: end,
					periodDays: revenueArray.length,
					growth,
					topSources
				}
			};
			
		} catch(err) {
			console.error(err);
			throw new Error('Failed to get revenue metrics');
		}
	}
	static async getVisits(startDate, endDate) {
	  // try {
		   // const [response] = await analyticsDataClient.runReport({
			  // property: `properties/${propertyId}`,
			  // dimensions: [
				// {
				  // name: 'country',
				// },
			  // ],
			  // metrics: [
				  // {
					// "name": "activeUsers"
				  // },
				  // {
					// "name": "newUsers"
				  // },
				  // {
					// "name": "totalRevenue"
				  // }
			  // ],
			  // dateRanges: [
				// {
				  // startDate: startDate,
				  // endDate: endDate,
				// },
			  // ],
			// });
			
			// const metricHeaders = response.metricHeaders.map(header => header.name);

			// Agora, vamos processar as linhas e criar um objeto com os totais
			// const totals = {
			  // activeUsers: 0,
			  // newUsers: 0,
			  // totalRevenue: 0
			// };	

			// response.rows.forEach(row => {
			  // row.metricValues.forEach((metricValue, index) => {
				// const metricName = metricHeaders[index];
				// const value = parseFloat(metricValue.value);
				
				// if (metricName === 'activeUsers') {
				  // totals.activeUsers += value;
				// } else if (metricName === 'newUsers') {
				  // totals.newUsers += value;
				// } else if (metricName === 'totalRevenue') {
				  // totals.totalRevenue += value;
				// }
			  // });
			// });
			
			// return { totals, detailedData: response.rows };
			
	  // } catch (error) {
		// console.error('Erro ao executar o relatório:', error);
		// throw error; // Lança o erro para ser tratado pelo chamador
	  // }
	}
	  
	static async getUserRetention(startDate, endDate) {
	  // Função auxiliar para formatar a data
	  // try {
		// const start = data.formatDate(startDate);
		// const end = data.formatDate(endDate);

		// const [response] = await analyticsDataClient.runReport({
		  // property: `properties/${propertyId}`,
		  // dimensions: [
			// { name: 'cohort' },
			// { name: 'cohortNthDay' }
		  // ],
		  // metrics: [
			// { name: 'cohortActiveUsers' },
			// { name: 'cohortTotalUsers' }
		  // ],
		  // cohortSpec: {
			// cohorts: [
			  // {
				// dimension: 'firstSessionDate',
				// dateRange: {
				  // startDate: start,
				  // endDate: end,
				// },
			  // },
			// ],
			// cohortsRange: {
			  // granularity: 'DAILY',
			  // startOffset: 0,
			  // endOffset: 30,
			// },
		  // },
		// });

		// Processar os dados de retenção
		// const retentionData = response.rows.map(row => ({
		  // cohort: row.dimensionValues[0].value,
		  // day: parseInt(row.dimensionValues[1].value),
		  // activeUsers: parseInt(row.metricValues[0].value),
		  // totalUsers: parseInt(row.metricValues[1].value),
		  // retentionRate: (parseInt(row.metricValues[0].value) / parseInt(row.metricValues[1].value)) * 100
		// }));

		// Calcular a média de retenção
		// const totalDays = retentionData.length;
		// const sumRetention = retentionData.reduce((sum, data) => sum + data.retentionRate, 0);
		// const averageRetention = sumRetention / totalDays;

		// Calcular retenção em marcos específicos
		// const getRetentionAtDay = (day) => {
		  // const data = retentionData.find(d => d.day === day);
		  // return data ? data.retentionRate : 0;
		// };

		// const retentionSummary = {
		  // day1: getRetentionAtDay(1),
		  // day7: getRetentionAtDay(7),
		  // day30: getRetentionAtDay(30),
		// };

		// return {
		  // detailedData: retentionData,
		  // averageRetention: averageRetention,
		  // retentionSummary: retentionSummary,
		  // startDate: start,
		  // endDate: end,
		  // totalDays: totalDays,
		// };

	  // } catch (error) {
		// console.error('Erro ao executar o relatório de retenção:', error);
		// throw error;
	  // }
	}	
}

module.exports = data