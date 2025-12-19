// src/validators/productValidators.ts (or inline in routes file)

import { body } from "express-validator";
import { ProductTypes } from "../models/Product";

/**
 * Validates product attributes based on productType
 * @param isRequired - If true, attributes are required. If false, they're optional (for PATCH)
 */

export const AllowedProductAttributes: Record<ProductTypes, string[]> = {
    [ProductTypes.Ring]: ["size", "material", "gemstone", "carats"],
    [ProductTypes.Necklace]: ["length", "material", "claspType", "chainType"],
    [ProductTypes.Bracelet]: ["length", "material", "claspType", "style"],
    [ProductTypes.Earring]: ["type", "material", "backType", "length"],
};


export const validateProductAttributes = (isRequired: boolean = true) => {
    return body("attributes").custom((value, { req }) => {
        // If attributes not provided
        if (!value) {
            // For PATCH (partial update), attributes are optional
            if (!isRequired) {
                return true;
            }
            // For POST (create), attributes are required
            throw new Error("Los atributos del producto son requeridos");
        }

        // Ensure attributes is an object
        if (typeof value !== 'object' || Array.isArray(value)) {
            throw new Error("Los atributos deben ser un objeto");
        }

        // Get productType - could be in body (POST) or need to fetch from DB (PATCH)
        const productType = req.body.productType;
        
        // If no productType in body (PATCH without type change), skip validation
        // The existing product type will be used
        if (!productType && !isRequired) {
            // Just validate it's a valid object structure
            return true;
        }

        // If productType is provided, validate attributes match that type
        if (productType) {
            const allowedKeys = AllowedProductAttributes[productType as ProductTypes];

            if (!allowedKeys) {
                throw new Error("Tipo de producto inválido");
            }

            const invalidKeys = Object.keys(value).filter(
                key => !allowedKeys.includes(key)
            );

            if (invalidKeys.length) {
                throw new Error(
                    `Atributos inválidos para ${productType}: ${invalidKeys.join(", ")}`
                );
            }

            switch (productType) {
                case ProductTypes.Ring:
                    return validateRingAttributes(value, isRequired);
                case ProductTypes.Necklace:
                    return validateNecklaceAttributes(value, isRequired);
                case ProductTypes.Bracelet:
                    return validateBraceletAttributes(value, isRequired);
                case ProductTypes.Earring:
                    return validateEarringAttributes(value, isRequired);
            }
        }

        return true;
    });
};

// Validation functions for each product type
function validateRingAttributes(attrs: any, isRequired: boolean): boolean {
    const { size, material, gemstone, carats } = attrs;

    // Required fields (only if isRequired = true)
    if (isRequired) {
        if (!size || typeof size !== 'string' || size.trim() === '') {
            throw new Error("El tamaño del anillo es requerido");
        }

        if (!material || typeof material !== 'string' || material.trim() === '') {
            throw new Error("El material del anillo es requerido");
        }
    } else {
        // For PATCH, validate only if provided
        if (size !== undefined && (typeof size !== 'string' || size.trim() === '')) {
            throw new Error("El tamaño del anillo debe ser un texto válido");
        }

        if (material !== undefined && (typeof material !== 'string' || material.trim() === '')) {
            throw new Error("El material del anillo debe ser un texto válido");
        }
    }

    // Optional fields validation (always validate if provided)
    if (gemstone !== undefined && (typeof gemstone !== 'string' || gemstone.trim() === '')) {
        throw new Error("La piedra debe ser un texto válido");
    }

    if (carats !== undefined && (typeof carats !== 'number' || carats <= 0)) {
        throw new Error("Los quilates deben ser un número mayor a 0");
    }

    return true;
}

function validateNecklaceAttributes(attrs: any, isRequired: boolean): boolean {
    const { length, material, claspType, chainType } = attrs;

    if (isRequired) {
        // Required fields for creation
        if (!length || typeof length !== 'string' || length.trim() === '') {
            throw new Error("El largo del collar es requerido");
        }

        if (!material || typeof material !== 'string' || material.trim() === '') {
            throw new Error("El material del collar es requerido");
        }

        if (!claspType || typeof claspType !== 'string' || claspType.trim() === '') {
            throw new Error("El tipo de cierre del collar es requerido");
        }

        if (!chainType || typeof chainType !== 'string' || chainType.trim() === '') {
            throw new Error("El tipo de cadena es requerido");
        }
    } else {
        // For PATCH, validate only if provided
        if (length !== undefined && (typeof length !== 'string' || length.trim() === '')) {
            throw new Error("El largo del collar debe ser un texto válido");
        }

        if (material !== undefined && (typeof material !== 'string' || material.trim() === '')) {
            throw new Error("El material del collar debe ser un texto válido");
        }

        if (claspType !== undefined && (typeof claspType !== 'string' || claspType.trim() === '')) {
            throw new Error("El tipo de cierre del collar debe ser un texto válido");
        }

        if (chainType !== undefined && (typeof chainType !== 'string' || chainType.trim() === '')) {
            throw new Error("El tipo de cadena debe ser un texto válido");
        }
    }

    return true;
}

function validateBraceletAttributes(attrs: any, isRequired: boolean): boolean {
    const { length, material, claspType, style } = attrs;

    if (isRequired) {
        // Required fields for creation
        if (!length || typeof length !== 'string' || length.trim() === '') {
            throw new Error("El largo de la pulsera es requerido");
        }

        if (!material || typeof material !== 'string' || material.trim() === '') {
            throw new Error("El material de la pulsera es requerido");
        }

        if (!claspType || typeof claspType !== 'string' || claspType.trim() === '') {
            throw new Error("El tipo de cierre de la pulsera es requerido");
        }

        if (!style || typeof style !== 'string' || style.trim() === '') {
            throw new Error("El estilo de la pulsera es requerido");
        }
    } else {
        // For PATCH, validate only if provided
        if (length !== undefined && (typeof length !== 'string' || length.trim() === '')) {
            throw new Error("El largo de la pulsera debe ser un texto válido");
        }

        if (material !== undefined && (typeof material !== 'string' || material.trim() === '')) {
            throw new Error("El material de la pulsera debe ser un texto válido");
        }

        if (claspType !== undefined && (typeof claspType !== 'string' || claspType.trim() === '')) {
            throw new Error("El tipo de cierre de la pulsera debe ser un texto válido");
        }

        if (style !== undefined && (typeof style !== 'string' || style.trim() === '')) {
            throw new Error("El estilo de la pulsera debe ser un texto válido");
        }
    }

    return true;
}

function validateEarringAttributes(attrs: any, isRequired: boolean): boolean {
    const { type, material, backType, length } = attrs;

    if (isRequired) {
        // Required fields for creation
        if (!type || typeof type !== 'string' || type.trim() === '') {
            throw new Error("El tipo de aros es requerido");
        }

        if (!material || typeof material !== 'string' || material.trim() === '') {
            throw new Error("El material de los aros es requerido");
        }

        if (!backType || typeof backType !== 'string' || backType.trim() === '') {
            throw new Error("El tipo de cierre de los aros es requerido");
        }
    } else {
        // For PATCH, validate only if provided
        if (type !== undefined && (typeof type !== 'string' || type.trim() === '')) {
            throw new Error("El tipo de aros debe ser un texto válido");
        }

        if (material !== undefined && (typeof material !== 'string' || material.trim() === '')) {
            throw new Error("El material de los aros debe ser un texto válido");
        }

        if (backType !== undefined && (typeof backType !== 'string' || backType.trim() === '')) {
            throw new Error("El tipo de cierre de los aros debe ser un texto válido");
        }
    }

    // Optional field validation (always validate if provided)
    if (length !== undefined && (typeof length !== 'string' || length.trim() === '')) {
        throw new Error("El largo debe ser un texto válido");
    }

    return true;
}