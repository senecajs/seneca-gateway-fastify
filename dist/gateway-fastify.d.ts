type GatewayFastifyOptions = {
    auth?: {
        token: {
            name: string;
        };
        cookie?: any;
    };
    error?: {
        next: boolean;
    };
};
declare function gateway_fastify(this: any, options: GatewayFastifyOptions): {
    name: string;
    exports: {
        handler: (req: any, reply: any, next: any) => Promise<any>;
        hook: (req: any, res: any, next: any) => Promise<any>;
    };
};
declare namespace gateway_fastify {
    var defaults: {
        auth: {
            token: {
                name: string;
            };
            cookie: import("gubu").Node<{
                maxAge: number;
                httpOnly: boolean;
                sameSite: boolean;
            }>;
        };
        error: {
            next: boolean;
        };
    };
}
export default gateway_fastify;
