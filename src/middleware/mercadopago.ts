import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export const verifyMercadoPagoSignature = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
        if (process.env.NODE_ENV !== "production") {
            return next();
        }


		const signature = req.headers["x-signature"] as string | undefined;
		const requestId = req.headers["x-request-id"] as string | undefined;

		if (!signature || !requestId) {
			console.warn("MP webhook missing signature headers");
			res.status(200).send("OK");
            return
		}

		const { ts, v1 } = Object.fromEntries(
			signature.split(",").map((part) => {
				const [key, value] = part.split("=");
				return [key.trim(), value.trim()];
			}),
		);

		if (!ts || !v1) {
			console.warn("Invalid MP signature format");
			res.status(200).send("OK");
            return
		}

		const dataId =
			(req.query["data.id"] as string) ?? req.body?.data?.id ?? "";

		if (!dataId) {
			console.warn("MP webhook missing data.id");
			res.status(200).send("OK");
            return
		}

		const secret = process.env.MP_WEBHOOK_SECRET!;
		if (!secret) {
			throw new Error("MP_WEBHOOK_SECRET not configured");
		}

		const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

		const expectedSignature = crypto
			.createHmac("sha256", secret)
			.update(manifest)
			.digest("hex");

		if (expectedSignature !== v1) {
			console.warn("Invalid MP webhook signature", {
				dataId,
				requestId,
			});
			res.status(200).send("OK");
            return
		}

		// ✅ Signature valid
		next();
	} catch (error) {
		console.error("Error validating MP webhook signature", error);
		res.status(200).send("OK");
        return
	}
};
