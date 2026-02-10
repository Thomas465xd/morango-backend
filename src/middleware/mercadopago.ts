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

		console.log("MP webhook signature validation starting...", {
			hasSignature: !!req.headers["x-signature"],
			hasRequestId: !!req.headers["x-request-id"],
			queryDataId: req.query["data.id"],
			bodyDataId: req.body?.data?.id,
		});

		const signature = req.headers["x-signature"] as string | undefined;
		const requestId = req.headers["x-request-id"] as string | undefined;

		if (!signature || !requestId) {
			console.warn("MP webhook missing signature headers — skipping webhook");
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
			console.warn("Invalid MP webhook signature — rejecting", {
				dataId,
				requestId,
				receivedV1: v1?.slice(0, 12) + "...",
				expectedPrefix: expectedSignature.slice(0, 12) + "...",
			});
			res.status(200).send("OK");
            return
		}

		// ✅ Signature valid
		console.log("MP webhook signature valid, proceeding to handler");
		next();
	} catch (error) {
		console.error("Error validating MP webhook signature", error);
		res.status(200).send("OK");
        return
	}
};
