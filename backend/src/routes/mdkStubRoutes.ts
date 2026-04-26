import { Router } from "express";

/**
 * Next.js apps sometimes mount `@moneydevkit/nextjs` under `/api/mdk`.
 * This backend does not embed MDK; respond with a clear stub so clients can branch.
 */
export const mdkStubRoutes = Router();

mdkStubRoutes.use((_req, res) => {
  return res.status(501).json({
    ok: false,
    error: "mdk_not_configured",
    message:
      "MoneyDevKit is not wired on this Express server. Use /api/payments/wallet/* and /api/premium/* for Lightning + paid agent flows."
  });
});
