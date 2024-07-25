const { conn } = require('../../models/db');

const pricingPlans = {
  basic: {
    name: "Basic",
    basePrice: 3500,
    features: [
      "Verificador de Plágio",
      "Gerador de Templates",
      "Gerador de Referências Bibliográficas",
      "Suporte por e-mail"
    ]
  },
  premium: {
    name: "Premium",
    basePrice: 10000,
    features: [
      "Tudo do pacote Basic",
      "Criador de Monografia",
      "Gerador de Temas Inovadores",
      "Gerador de Hipóteses",
      "Suporte por chat"
    ]
  },
  supreme: {
    name: "Supreme",
    basePrice: null, // Preço customizado
    features: [
      "Tudo do pacote Premium",
      "Avaliador de Temas (brevemente)",
      "Consultoria Acadêmica Personalizada",
      "Suporte prioritário 24/7",
      "Acesso antecipado a novas funcionalidades"
    ]
  }
};

async function getUserTransactions(userId) {
  return new Promise((resolve, reject) => {
    conn.query('SELECT * FROM transactions WHERE user_id = ?', [userId], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

function calculateDiscount(transactions) {
  const newUserDiscountPercentage = 50; // 15% de desconto para novos usuários

  if (transactions.length === 0) {
    return newUserDiscountPercentage / 100;
  } else {
	return 0
  }
}

async function getPricingPlansWithDiscount(userId) {
  try {
    const transactions = await getUserTransactions(userId);
    const discount = calculateDiscount(transactions);

    const plansWithDiscount = Object.entries(pricingPlans).reduce((acc, [key, plan]) => {
      if (plan.basePrice !== null) {
        const discountedPrice = Math.round(plan.basePrice * (1 - discount));
        acc[key] = {
          ...plan,
          price: discountedPrice,
          originalPrice: plan.basePrice,
          discount: discount * 100
        };
      } else {
        acc[key] = { ...plan };
      }
      return acc;
    }, {});

    return plansWithDiscount;
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    return pricingPlans; // Retorna os preços originais em caso de erro
  }
}

module.exports = { getPricingPlansWithDiscount };