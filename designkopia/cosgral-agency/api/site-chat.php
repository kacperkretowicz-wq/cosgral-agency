<?php
/**
 * COSGRAL live chat API (SEOHOST / PHP).
 *
 * GET  ?visitor_key=…  → proxy do Cosgral Hub + flaga human_takeover
 * POST JSON            → Hub + Gemini Flash (dopóki człowiek nie odpisze)
 *
 * Secrets: api/site-chat.secrets.php (nie w git) albo env GEMINI_API_KEY.
 */
declare(strict_types=1);

require __DIR__ . '/knowledge.php';

const HUB_API = 'https://cosgralhub.netlify.app/api/site-chat';
const AI_SOURCE = 'cosgral-ai';
/** UTF-8 zero-width space wrapper — marks AI replies mirrored into Hub. */
const AI_BODY_PREFIX = "\xE2\x80\x8Bcgai\xE2\x80\x8B";
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Visitor-Key');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function load_secrets(): array
{
    $out = [
        'GEMINI_API_KEY' => (string)(getenv('GEMINI_API_KEY') ?: ''),
        'GEMINI_MODEL' => (string)(getenv('GEMINI_MODEL') ?: DEFAULT_GEMINI_MODEL),
        'CHAT_HUB_AGENT_PIN' => (string)(getenv('CHAT_HUB_AGENT_PIN') ?: ''),
        'COSGRAL_HUB_CHAT_API' => (string)(getenv('COSGRAL_HUB_CHAT_API') ?: HUB_API),
    ];
    $file = __DIR__ . '/site-chat.secrets.php';
    if (is_readable($file)) {
        $local = require $file;
        if (is_array($local)) {
            foreach ($out as $k => $_) {
                if (!empty($local[$k]) && is_string($local[$k])) {
                    $out[$k] = $local[$k];
                }
            }
        }
    }
    if ($out['GEMINI_MODEL'] === '') {
        $out['GEMINI_MODEL'] = DEFAULT_GEMINI_MODEL;
    }
    $out['COSGRAL_HUB_CHAT_API'] = rtrim($out['COSGRAL_HUB_CHAT_API'] !== '' ? $out['COSGRAL_HUB_CHAT_API'] : HUB_API, '/');
    return $out;
}

function uuid_v4(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function http_json(string $method, string $url, ?array $body = null, array $headers = []): array
{
    $ch = curl_init($url);
    $hdrs = array_merge(['Accept: application/json'], $headers);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $hdrs,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_CONNECTTIMEOUT => 10,
    ];
    if ($body !== null) {
        $json = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $hdrs[] = 'Content-Type: application/json';
        $opts[CURLOPT_HTTPHEADER] = $hdrs;
        $opts[CURLOPT_POSTFIELDS] = $json;
    }
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false) {
        return ['ok' => false, 'status' => 0, 'data' => ['error' => $err]];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        $data = [];
    }
    return ['ok' => $status >= 200 && $status < 300, 'status' => $status, 'data' => $data];
}

function strip_ai_prefix(string $text): string
{
    if (strpos($text, AI_BODY_PREFIX) === 0) {
        return substr($text, strlen(AI_BODY_PREFIX));
    }
    return $text;
}

function is_ai_agent_message(array $m): bool
{
    if (($m['role'] ?? '') !== 'agent') {
        return false;
    }
    if (($m['source'] ?? '') === AI_SOURCE) {
        return true;
    }
    $id = (string)($m['id'] ?? '');
    if (strpos($id, 'ai-') === 0) {
        return true;
    }
    $body = (string)($m['body'] ?? '');
    return strpos($body, AI_BODY_PREFIX) === 0;
}

function detect_human_takeover(array $messages): bool
{
    foreach ($messages as $m) {
        if (!is_array($m)) {
            continue;
        }
        if (($m['role'] ?? '') === 'agent' && !is_ai_agent_message($m)) {
            return true;
        }
    }
    return false;
}

function normalize_messages(array $messages): array
{
    $out = [];
    foreach ($messages as $m) {
        if (!is_array($m)) {
            continue;
        }
        if (is_ai_agent_message($m)) {
            $m['body'] = strip_ai_prefix((string)($m['body'] ?? ''));
            $m['source'] = AI_SOURCE;
        }
        $out[] = $m;
    }
    return $out;
}

function hub_get(string $api, string $visitorKey): array
{
    $url = $api . '?visitor_key=' . rawurlencode($visitorKey) . '&_=' . (string)time();
    return http_json('GET', $url);
}

function hub_post_visitor(string $api, string $visitorKey, string $body, string $pageUrl): array
{
    return http_json('POST', $api, [
        'visitor_key' => $visitorKey,
        'body' => $body,
        'page_url' => $pageUrl,
    ]);
}

function hub_post_agent(string $api, string $visitorKey, string $body, string $pin): ?array
{
    if ($pin === '') {
        return null;
    }
    $res = http_json(
        'POST',
        $api,
        [
            'visitor_key' => $visitorKey,
            'body' => AI_BODY_PREFIX . $body,
            'role' => 'agent',
            'source' => AI_SOURCE,
        ],
        [
            'X-Chat-Agent-Pin: ' . $pin,
            'X-Visitor-Key: ' . $visitorKey,
        ]
    );
    if (!$res['ok']) {
        return null;
    }
    $msg = $res['data']['message'] ?? null;
    if (!is_array($msg) || ($msg['role'] ?? '') !== 'agent') {
        return null;
    }
    $msg['body'] = strip_ai_prefix((string)($msg['body'] ?? ''));
    $msg['source'] = AI_SOURCE;
    return $msg;
}

function fallback_ai_text(): string
{
    return 'Dzięki za wiadomość — zespół Cosgral właśnie ją widzi i odpisze tak szybko, jak to możliwe. '
        . 'Tymczasem możesz napisać, czego potrzebujesz (strona, aplikacja, CRM, SEO albo wideo), '
        . 'albo zadzwonić: Jakub +48 533 790 518 · Kacper +48 571 798 397.';
}

function gemini_reply(string $apiKey, string $model, array $history, string $latestUser, string $pageUrl): string
{
    $contents = [];
    $latest = mb_substr($latestUser, 0, 2000, 'UTF-8');
    $hist = array_slice($history, -12);
    foreach ($hist as $m) {
        if (!is_array($m) || empty($m['body'])) {
            continue;
        }
        $role = (($m['role'] ?? '') === 'agent' || ($m['role'] ?? '') === 'model') ? 'model' : 'user';
        $contents[] = [
            'role' => $role,
            'parts' => [['text' => mb_substr((string)$m['body'], 0, 2000, 'UTF-8')]],
        ];
    }
    while (
        $contents !== []
        && ($contents[count($contents) - 1]['role'] ?? '') === 'user'
        && ($contents[count($contents) - 1]['parts'][0]['text'] ?? '') === $latest
    ) {
        array_pop($contents);
    }
    $contents[] = ['role' => 'user', 'parts' => [['text' => $latest]]];

    $url = 'https://generativelanguage.googleapis.com/v1beta/models/'
        . rawurlencode($model)
        . ':generateContent?key='
        . rawurlencode($apiKey);

    $payload = [
        'systemInstruction' => [
            'parts' => [['text' => cosgral_chat_system_instruction($pageUrl)]],
        ],
        'contents' => $contents,
        'generationConfig' => [
            'temperature' => 0.55,
            'maxOutputTokens' => 512,
        ],
    ];

    $res = http_json('POST', $url, $payload);
    if (!$res['ok']) {
        throw new RuntimeException('gemini_failed');
    }
    $parts = $res['data']['candidates'][0]['content']['parts'] ?? [];
    $text = '';
    foreach ($parts as $p) {
        if (is_array($p) && isset($p['text'])) {
            $text .= (string)$p['text'];
        }
    }
    $text = trim($text);
    if ($text === '') {
        throw new RuntimeException('gemini_empty');
    }
    return mb_substr($text, 0, 2000, 'UTF-8');
}

$secrets = load_secrets();
$hubApi = $secrets['COSGRAL_HUB_CHAT_API'];
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'GET') {
    $visitorKey = trim((string)($_GET['visitor_key'] ?? ''));
    if (strlen($visitorKey) < 8) {
        respond(400, ['error' => 'visitor_key_required']);
    }
    $hub = hub_get($hubApi, $visitorKey);
    if (!$hub['ok']) {
        respond(502, ['error' => 'hub_unavailable']);
    }
    $messages = is_array($hub['data']['messages'] ?? null) ? $hub['data']['messages'] : [];
    respond(200, [
        'thread_id' => $hub['data']['thread_id'] ?? null,
        'messages' => normalize_messages($messages),
        'human_takeover' => detect_human_takeover($messages),
    ]);
}

if ($method !== 'POST') {
    respond(405, ['error' => 'method_not_allowed']);
}

$raw = file_get_contents('php://input') ?: '';
$payload = json_decode($raw, true);
if (!is_array($payload)) {
    respond(400, ['error' => 'invalid_json']);
}

$visitorKey = trim((string)($payload['visitor_key'] ?? ''));
$body = trim((string)($payload['body'] ?? ''));
$pageUrl = mb_substr((string)($payload['page_url'] ?? ''), 0, 500, 'UTF-8');
$history = is_array($payload['history'] ?? null) ? $payload['history'] : [];

if (strlen($visitorKey) < 8) {
    respond(400, ['error' => 'visitor_key_required']);
}
if ($body === '' || mb_strlen($body, 'UTF-8') > 2000) {
    respond(400, ['error' => 'body_invalid']);
}

$hubPost = hub_post_visitor($hubApi, $visitorKey, $body, $pageUrl);
if (!$hubPost['ok']) {
    respond(502, ['error' => 'hub_unavailable']);
}

$visitorMessage = $hubPost['data']['message'] ?? [
    'id' => uuid_v4(),
    'thread_id' => $hubPost['data']['thread_id'] ?? null,
    'role' => 'visitor',
    'body' => $body,
    'created_at' => gmdate('c'),
];

$hubSnap = hub_get($hubApi, $visitorKey);
$existing = ($hubSnap['ok'] && is_array($hubSnap['data']['messages'] ?? null))
    ? $hubSnap['data']['messages']
    : [];
$humanTakeover = detect_human_takeover($existing);

if ($humanTakeover) {
    respond(201, [
        'thread_id' => $hubPost['data']['thread_id'] ?? ($hubSnap['data']['thread_id'] ?? null),
        'message' => $visitorMessage,
        'ai_message' => null,
        'human_takeover' => true,
    ]);
}

try {
    if ($secrets['GEMINI_API_KEY'] === '') {
        throw new RuntimeException('missing_gemini_key');
    }
    $replyText = gemini_reply(
        $secrets['GEMINI_API_KEY'],
        $secrets['GEMINI_MODEL'],
        $history !== [] ? $history : $existing,
        $body,
        $pageUrl
    );
} catch (Throwable $e) {
    $replyText = fallback_ai_text();
}

$aiMessage = hub_post_agent($hubApi, $visitorKey, $replyText, $secrets['CHAT_HUB_AGENT_PIN']);
if ($aiMessage === null) {
    $aiMessage = [
        'id' => 'ai-' . uuid_v4(),
        'thread_id' => $hubPost['data']['thread_id'] ?? null,
        'role' => 'agent',
        'body' => $replyText,
        'source' => AI_SOURCE,
        'created_at' => gmdate('c'),
    ];
}

respond(201, [
    'thread_id' => $hubPost['data']['thread_id'] ?? null,
    'message' => $visitorMessage,
    'ai_message' => $aiMessage,
    'human_takeover' => false,
]);
