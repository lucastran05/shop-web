import { shopConfig } from "../constants/shop";
import { useShop } from "./useShop";

export function useShopConfig() {
  const { shopInfo } = useShop();
  return {
    ...shopConfig,
    ...shopInfo,
    contact: { ...shopConfig.contact, ...shopInfo?.contact },
  };
}
