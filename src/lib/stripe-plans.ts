export const STRIPE_PLANS = {
  broker: {
    price_id: "price_1T5bf1Hq599RjzwdlyH7TbSs",
    product_id: "prod_U3j7mhAb9ZYyXm",
    name: "Broker",
    price: 9.70,
    included_users: 1,
    description: "Para corretores autônomos",
  },
  imobiliaria: {
    price_id: "price_1T5bfKHq599RjzwdDRpGSbdG",
    product_id: "prod_U3j7dxfy41mYRI",
    name: "Imobiliária",
    price: 19.70,
    included_users: 3,
    description: "Para imobiliárias e equipes",
  },
} as const;

export const EXTRA_USER_PRICE = {
  price_id: "price_1T5bfiHq599RjzwdagCCQxOv",
  product_id: "prod_U3j7ytLzopaE2M",
  price: 4.90,
};

export type PlanType = keyof typeof STRIPE_PLANS;
