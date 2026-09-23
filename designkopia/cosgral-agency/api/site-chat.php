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
const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

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
        CURLOPT_TIMEOUT => 18,
        CURLOPT_CONNECTTIMEOUT => 8,
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

function agent_alias_map(): array
{
    static $map = null;
    if ($map !== null) {
        return $map;
    }
    $map = [
        'jakub' => 'Jakub',
        'jakubgral' => 'Jakub',
        'jakubczupajlo' => 'Jakub',
        'kacper' => 'Kacper',
        'kacperkretowicz' => 'Kacper',
        'kuba' => 'Jakub',
    ];
    $file = __DIR__ . '/site-chat.secrets.php';
    if (is_readable($file)) {
        $local = require $file;
        if (is_array($local) && !empty($local['AGENT_ALIASES']) && is_array($local['AGENT_ALIASES'])) {
            foreach ($local['AGENT_ALIASES'] as $k => $v) {
                if (is_string($k) && is_string($v) && $k !== '' && $v !== '') {
                    $map[mb_strtolower($k, 'UTF-8')] = $v;
                }
            }
        }
    }
    return $map;
}

function first_non_empty_string(array $values): string
{
    foreach ($values as $v) {
        if (is_string($v)) {
            $t = trim($v);
            if ($t !== '') {
                return $t;
            }
        }
    }
    return '';
}

function nested_string(array $m, string $path): string
{
    $cur = $m;
    foreach (explode('.', $path) as $part) {
        if (!is_array($cur) || !array_key_exists($part, $cur)) {
            return '';
        }
        $cur = $cur[$part];
    }
    return is_string($cur) ? trim($cur) : '';
}

function resolve_agent_name(array $m): string
{
    if (is_ai_agent_message($m)) {
        return 'Cosgral AI';
    }

    $raw = first_non_empty_string([
        $m['agent_name'] ?? null,
        $m['sender_name'] ?? null,
        $m['author_name'] ?? null,
        $m['display_name'] ?? null,
        $m['user_name'] ?? null,
        $m['username'] ?? null,
        $m['login'] ?? null,
        $m['handle'] ?? null,
        $m['name'] ?? null,
        nested_string($m, 'agent.name'),
        nested_string($m, 'agent.display_name'),
        nested_string($m, 'agent.username'),
        nested_string($m, 'user.name'),
        nested_string($m, 'user.display_name'),
        nested_string($m, 'user.username'),
        nested_string($m, 'sender.name'),
        nested_string($m, 'author.name'),
        nested_string($m, 'meta.agent_name'),
        nested_string($m, 'meta.name'),
        nested_string($m, 'meta.username'),
    ]);

    $email = first_non_empty_string([
        $m['agent_email'] ?? null,
        $m['user_email'] ?? null,
        $m['email'] ?? null,
        nested_string($m, 'agent.email'),
        nested_string($m, 'user.email'),
        nested_string($m, 'sender.email'),
        nested_string($m, 'meta.email'),
    ]);

    $hay = mb_strtolower(trim($raw . ' ' . $email), 'UTF-8');
    foreach (agent_alias_map() as $needle => $label) {
        if ($needle !== '' && $hay !== '' && strpos($hay, $needle) !== false) {
            return $label;
        }
    }

    if ($raw !== '') {
        // First token as given name if Hub sends full name
        $parts = preg_split('/\s+/u', $raw) ?: [];
        $first = $parts[0] ?? $raw;
        foreach (agent_alias_map() as $needle => $label) {
            if (mb_strtolower($first, 'UTF-8') === $needle) {
                return $label;
            }
        }
        if (preg_match('/^(jakub|kacper)$/iu', $first)) {
            return mb_convert_case($first, MB_CASE_TITLE, 'UTF-8');
        }
        return $first;
    }

    return 'Konsultant';
}

function enrich_agent_message(array $m): array
{
    $ai = is_ai_agent_message($m);
    if ($ai) {
        $m['body'] = strip_ai_prefix((string)($m['body'] ?? ''));
        $m['source'] = AI_SOURCE;
        $m['agent_kind'] = 'ai';
        $m['agent_name'] = 'Cosgral AI';
    } else {
        $m['agent_kind'] = 'human';
        $m['agent_name'] = resolve_agent_name($m);
    }
    return $m;
}

function normalize_messages(array $messages): array
{
    $out = [];
    foreach ($messages as $m) {
        if (!is_array($m)) {
            continue;
        }
        if (($m['role'] ?? '') === 'agent') {
            $m = enrich_agent_message($m);
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
    $msg['agent_kind'] = 'ai';
    $msg['agent_name'] = 'Cosgral AI';
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
            'temperature' => 0.82,
            'topP' => 0.95,
            'maxOutputTokens' => 2048,
        ],
    ];

    $res = http_json('POST', $url, $payload);
    if (!$res['ok']) {
        throw new RuntimeException('gemini_failed');
    }
    $candidate = $res['data']['candidates'][0] ?? null;
    $finish = is_array($candidate) ? (string)($candidate['finishReason'] ?? '') : '';
    if ($finish === 'SAFETY' || $finish === 'BLOCKLIST' || $finish === 'PROHIBITED_CONTENT') {
        return 'Jasne — wróćmy do rzeczy. W czym mogę pomóc w sprawie strony, CRM, SEO albo automatyzacji?';
    }
    $parts = is_array($candidate) ? ($candidate['content']['parts'] ?? []) : [];
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
    $normalized = normalize_messages($messages);
    $takeover = detect_human_takeover($messages);
    $active = null;
    if ($takeover) {
        for ($i = count($normalized) - 1; $i >= 0; $i--) {
            $m = $normalized[$i];
            if (($m['role'] ?? '') === 'agent' && ($m['agent_kind'] ?? '') === 'human') {
                $active = ['kind' => 'human', 'name' => (string)($m['agent_name'] ?? 'Konsultant')];
                break;
            }
        }
    } else {
        $active = ['kind' => 'ai', 'name' => 'Cosgral AI'];
    }
    respond(200, [
        'thread_id' => $hub['data']['thread_id'] ?? null,
        'messages' => $normalized,
        'human_takeover' => $takeover,
        'active_agent' => $active,
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
    $activeName = 'Konsultant';
    $normalizedExisting = normalize_messages($existing);
    for ($i = count($normalizedExisting) - 1; $i >= 0; $i--) {
        $m = $normalizedExisting[$i];
        if (($m['role'] ?? '') === 'agent' && ($m['agent_kind'] ?? '') === 'human') {
            $activeName = (string)($m['agent_name'] ?? 'Konsultant');
            break;
        }
    }
    respond(201, [
        'thread_id' => $hubPost['data']['thread_id'] ?? ($hubSnap['data']['thread_id'] ?? null),
        'message' => $visitorMessage,
        'ai_message' => null,
        'human_takeover' => true,
        'active_agent' => [
            'kind' => 'human',
            'name' => $activeName,
        ],
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
        'agent_kind' => 'ai',
        'agent_name' => 'Cosgral AI',
        'created_at' => gmdate('c'),
    ];
} else {
    $aiMessage = enrich_agent_message($aiMessage);
}

respond(201, [
    'thread_id' => $hubPost['data']['thread_id'] ?? null,
    'message' => $visitorMessage,
    'ai_message' => $aiMessage,
    'human_takeover' => false,
    'active_agent' => [
        'kind' => 'ai',
        'name' => 'Cosgral AI',
    ],
]);
