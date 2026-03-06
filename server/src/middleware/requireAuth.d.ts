import { Request, Response, NextFunction } from "express";
export type AuthedRequest = Request & {
    userId?: string;
};
export declare function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=requireAuth.d.ts.map