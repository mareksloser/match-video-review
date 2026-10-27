<?php

declare(strict_types=1);

namespace Mvr\Http;

/** Turns a Request into a Response: routing, CORS and error mapping. */
final class Kernel
{
    /** @param list<string> $corsOrigins */
    public function __construct(
        private readonly Router $router,
        private readonly array $corsOrigins = [],
        private readonly bool $debug = false,
    ) {
    }

    public function handle(Request $request): Response
    {
        if ($request->method === 'OPTIONS') {
            return $this->cors($request, new Response(204));
        }
        try {
            $response = $this->router->dispatch($request);
        } catch (HttpException $e) {
            $payload = ['error' => $e->getMessage()];
            if ($e->fieldErrors) {
                $payload['fields'] = $e->fieldErrors;
            }
            $response = Response::json($payload, $e->status);
        } catch (\Throwable $e) {
            error_log((string) $e);
            $response = Response::json(['error' => $this->debug ? $e->getMessage() : 'Chyba serveru.'], 500);
        }
        return $this->cors($request, $response);
    }

    private function cors(Request $request, Response $response): Response
    {
        $origin = $request->header('origin');
        if ($origin === null || !in_array($origin, $this->corsOrigins, true)) {
            return $response;
        }
        return $response->withHeaders([
            'Access-Control-Allow-Origin' => $origin,
            'Access-Control-Allow-Headers' => 'Authorization, Content-Type',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
            'Vary' => 'Origin',
        ]);
    }
}
