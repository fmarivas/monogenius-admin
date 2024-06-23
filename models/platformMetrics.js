require('dotenv').config()
const {conn} = require('./db')
const { v4: uuidv4 } = require('uuid');
const { analyticsDataClient, propertyId } = require('../controllers/analytics');
const moment =require('moment')

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
	
	static async getVisits(startDate, endDate) {
	  try {
		   const [response] = await analyticsDataClient.runReport({
			  property: `properties/${propertyId}`,
			  dimensions: [
				{
				  name: 'country',
				},
			  ],
			  metrics: [
				  {
					"name": "activeUsers"
				  },
				  {
					"name": "newUsers"
				  },
				  {
					"name": "totalRevenue"
				  }
			  ],
			  dateRanges: [
				{
				  startDate: startDate,
				  endDate: endDate,
				},
			  ],
			});
			
			const metricHeaders = response.metricHeaders.map(header => header.name);

			// Agora, vamos processar as linhas e criar um objeto com os totais
			const totals = {
			  activeUsers: 0,
			  newUsers: 0,
			  totalRevenue: 0
			};	

			response.rows.forEach(row => {
			  row.metricValues.forEach((metricValue, index) => {
				const metricName = metricHeaders[index];
				const value = parseFloat(metricValue.value);
				
				if (metricName === 'activeUsers') {
				  totals.activeUsers += value;
				} else if (metricName === 'newUsers') {
				  totals.newUsers += value;
				} else if (metricName === 'totalRevenue') {
				  totals.totalRevenue += value;
				}
			  });
			});
			
			return { totals, detailedData: response.rows };
			
	  } catch (error) {
		console.error('Erro ao executar o relatório:', error);
		throw error; // Lança o erro para ser tratado pelo chamador
	  }
	}
	  
static async getUserRetention(startDate, endDate) {
  // Função auxiliar para formatar a data
  try {
    const start = data.formatDate(startDate);
    const end = data.formatDate(endDate);

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dimensions: [
        { name: 'cohort' },
        { name: 'cohortNthDay' }
      ],
      metrics: [
        { name: 'cohortActiveUsers' },
        { name: 'cohortTotalUsers' }
      ],
      cohortSpec: {
        cohorts: [
          {
            dimension: 'firstSessionDate',
            dateRange: {
              startDate: start,
              endDate: end,
            },
          },
        ],
        cohortsRange: {
          granularity: 'DAILY',
          startOffset: 0,
          endOffset: 30,
        },
      },
    });

    // Processar os dados de retenção
    const retentionData = response.rows.map(row => ({
      cohort: row.dimensionValues[0].value,
      day: parseInt(row.dimensionValues[1].value),
      activeUsers: parseInt(row.metricValues[0].value),
      totalUsers: parseInt(row.metricValues[1].value),
      retentionRate: (parseInt(row.metricValues[0].value) / parseInt(row.metricValues[1].value)) * 100
    }));

    // Calcular a média de retenção
    const totalDays = retentionData.length;
    const sumRetention = retentionData.reduce((sum, data) => sum + data.retentionRate, 0);
    const averageRetention = sumRetention / totalDays;

    // Calcular retenção em marcos específicos
    const getRetentionAtDay = (day) => {
      const data = retentionData.find(d => d.day === day);
      return data ? data.retentionRate : 0;
    };

    const retentionSummary = {
      day1: getRetentionAtDay(1),
      day7: getRetentionAtDay(7),
      day30: getRetentionAtDay(30),
    };

    return {
      detailedData: retentionData,
      averageRetention: averageRetention,
      retentionSummary: retentionSummary,
      startDate: start,
      endDate: end,
      totalDays: totalDays,
    };

  } catch (error) {
    console.error('Erro ao executar o relatório de retenção:', error);
    throw error;
  }
}

	static getTotalUsers() {
	  return new Promise((resolve, reject) => {
		const query = `
		  SELECT COUNT(*) AS total_users
		  FROM users;
		`;
		conn.query(query, (err, results) => {
		  if (err) {
			reject(err);
		  } else {
			resolve(results[0].total_users);
		  }
		});
	  });
	}

	static getRevenue(startDate, endDate) {
		return new Promise((resolve, reject) => {
			const start = data.formatDate(startDate);
			const end = data.formatDate(endDate);
			
			const query = `
			  SELECT 
				DATE(transaction_date) as date,
				SUM(amount) as daily_revenue,
				COUNT(*) as transaction_count
			  FROM 
				transactions
			  WHERE 
				transaction_date BETWEEN ? AND ?
				AND status = 'completed'
			  GROUP BY 
				DATE(transaction_date)
			  ORDER BY 
				date ASC
			`;
			
			conn.query(query, [start, end], (err, results)=>{
				if(err){
					console.error(err)
					reject(err)
					return;
				}
				
				const revenueData = results.map(row => ({
					date: moment(row.date).format('YYYY-MM-DD'),
					dailyRevenue: parseFloat(row.daily_revenue),
					transactionCount: row.transaction_count
				}));

				const totalRevenue = revenueData.reduce((sum, day) => sum + day.dailyRevenue, 0);
				const averageDailyRevenue = totalRevenue / revenueData.length;
				const totalTransactions = revenueData.reduce((sum, day) => sum + day.transactionCount, 0);

				resolve({
					revenueData,
					summary: {
					  totalRevenue,
					  averageDailyRevenue,
					  totalTransactions,
					  startDate: start,
					  endDate: end,
					  periodDays: revenueData.length
					}
				});	
			})	
		});
	}	
}

module.exports = data