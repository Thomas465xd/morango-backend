import { ProductInterface } from "../models/Product";

// Checks if product discount is currently valid
export function checkDiscountValidity(discount: any): boolean {
    if (!discount || !discount.isActive || discount.percentage === 0) {
        return false;
    }
    
    const now = new Date();
    
    if (discount.startDate && now < new Date(discount.startDate)) {
        return false;
    }
    
    if (discount.endDate && now > new Date(discount.endDate)) {
        return false;
    }
    
    return true;
}

// Calculates final price for a product based on active discount
export function calculateFinalPrice(basePrice: number, discount: any): number {
    const isDiscountValid = checkDiscountValidity(discount);
    
    if (!isDiscountValid) {
        return basePrice;
    }
    
    return Math.round(basePrice * (1 - discount.percentage / 100));
}

// Enriches a single product with calculated fields
export function enrichProduct(product: ProductInterface) {
    const isDiscountValid = checkDiscountValidity(product.discount);
    const finalPrice = calculateFinalPrice(product.basePrice, product.discount);
    
    return {
        ...product,
        finalPrice,
        hasActiveDiscount: isDiscountValid,
        savings: isDiscountValid ? product.basePrice - finalPrice : 0,
        availableStock: product.stock - product.reserved
    };
}


// Enriches multiple products with calculated fields
export function enrichProducts(products: ProductInterface[]) {
    return products.map(enrichProduct);
}