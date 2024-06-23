require('dotenv').config();
const axios = require('axios')
const OpenAI = require('openai');
const openai = new OpenAI(process.env.OPENAI_API_KEY);
const mealCreation = require('../../controllers/function/hasCreatedMealToday')

class externaAPI{
	static async mealPlanner(user_data, user_details, user_id){
		const {diet_type, calories, carb, prot, lip, water, meal_count, selectedFoods} = user_data;		
		const intolerance = user_details.intolerancias_alimentares
		const userCountry = user_details.country
		
		const favoritesFoods = selectedFoods.length>0 ? selectedFoods: "Sem Alimentos Favoritos"
		
		//verificar se o usuario ja criou uma receita
		try{
			const setLastMeal = await mealCreation.setLastMealCreationDate(user_id)

			const message = `Você é um assistente de dieta.\nGere um cardápio em formato direto (sem introdução, observações ou conclusões, apenas as Refeições, sem escrever o nome da refeição, apenas organize em refeições, seus respectivos números, as refeicoes organizadas em paragrafos, suas respectivas quantidades que equivalham ao numero de macros proposto e no final diga "Obrigado") para uma dieta ${diet_type} com base nas seguintes informações:\n- Número de Refeições: ${meal_count}\n- Intolerância Alimentar: ${intolerance}\n- Calorias: ${calories}\n- Carboidratos: ${carb}g\n- Proteínas: ${prot}g\n- Gorduras: ${lip}g\n-Alimentos favoritos a incluir: ${favoritesFoods}`;
			
			try{
				const completion = await openai.chat.completions.create({
					model: "gpt-3.5-turbo",
					messages: [
						{ role: "system", content: "Você é um assistente de dieta." },
						{ role: "user", content: message }
					]
				});

				// Exiba a primeira escolha de conclusão
				return externaAPI.formatResponse(completion.choices[0].message.content);
			}catch (error){
				console.error('Error:', error);
				throw new Error('Failed to generate meal plan');
			}
		}catch(err){
			console.error(err)	
		}
	}
	
	// Função para formatar a resposta
	static formatResponse(response) {
		// Substituir todas as vírgulas por <br> para criar quebras de linha
		response = response.replace(/,/g, '<br>');
		
		// Substituir a palavra "Obrigado" por uma string vazia
		response = response.replace(/Obrigado./g, '');

		// Dividir a resposta em uma matriz de refeições usando o número como delimitador
		const meals = response.split(/\d+\./);

		// Filtrar a matriz para remover strings vazias e adicionar "Refeição {número}" para cada item
		const formattedMeals = meals.filter(meal => meal.trim() !== '').map((meal, index) => {
			return `<strong>Refeição ${index + 1}:</strong> <br>${meal.trim()}<br><br>`;
		});

		// Juntar as refeições formatadas com quebras de linha entre elas
		return formattedMeals.join('\n\n') + '<br><strong>Obrigado.</strong>';
	}	
	
	static async foodSearch(query){
		const config = {
			headers: {
				'Content-Type': 'application/json',
				'x-app-key': process.env.trackApiKey,
				'x-app-id': process.env.trackAppID
			}			
		}
		
		const linkApi  = `https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(query)}`
		
		try{
			const response = await axios.get(linkApi, config)
			const foods = response.data.branded.concat(response.data.common || []);

			return foods
		}
		catch(err){
			console.error(err)
			throw new Error('Erro ao criar consultar alimento')			
		}
	}
	
	static async foodCreator(query){
		const config = {
			headers: {
				'Content-Type': 'application/json',
				'x-app-key': process.env.trackApiKey,
				'x-app-id': process.env.trackAppID
			}			
		}
		
		const requestBody = {
			query: query // Aqui, `query` deve ser a string de consulta
		};		
		
		const linkApi  = `https://trackapi.nutritionix.com/v2/natural/nutrients`
		
		try{
			const response = await axios.post(linkApi, requestBody, config)
			
			const { food_name, nf_calories, nf_protein, nf_total_carbohydrate, nf_total_fat, serving_unit, serving_weight_grams } = response.data.foods[0]
			
			return { food_name, nf_calories, nf_protein, nf_total_carbohydrate, nf_total_fat, serving_unit, serving_weight_grams }
		}
		catch(err){
			console.error(err)
			throw new Error('Erro ao adicionar alimento')	
		}
	}	
}

module.exports = externaAPI