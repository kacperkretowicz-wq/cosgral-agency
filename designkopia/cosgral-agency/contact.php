<?php
/**
 * COSGRAL — formularz kontaktowy (SEOHOST / LiteSpeed + PHP mail()).
 *
 * Przyjmuje POST (application/x-www-form-urlencoded lub multipart) z pól:
 *   name, email, company, message, bot-field (honeypot), lang
 * Odpowiada JSON: { ok: true } albo { ok: false, error: "..." } + kod HTTP.
 *
 * Adresat: kontakt@cosgral.pl. Nadawca (From) musi być w domenie hostowanej na
 * tym koncie SEOHOST — inaczej mail() jest odrzucany / ląduje w spamie.
 */

declare(strict_types=1);

const CONTACT_TO   = 'kontakt@cosgral.pl';
const CONTACT_FROM = 'kontakt@cosgral.pl';
const CONTACT_FROM_NAME = 'COSGRAL — formularz';
const MAX_FIELD = 200;
const MAX_MESSAGE = 6000;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method']);
}

/** Jedna linia, bez znaków sterujących — chroni nagłówki przed wstrzyknięciem. */
function line(string $value, int $max = MAX_FIELD): string
{
    $value = preg_replace('/[\r\n\t\x00-\x1F\x7F]+/u', ' ', $value) ?? '';
    $value = trim(preg_replace('/\s{2,}/u', ' ', $value) ?? '');
    return mb_substr($value, 0, $max, 'UTF-8');
}

function field(string $key): string
{
    $raw = $_POST[$key] ?? '';
    return is_string($raw) ? $raw : '';
}

// Honeypot: boty wypełniają ukryte pole — udajemy sukces, nic nie wysyłamy.
if (line(field('bot-field')) !== '') {
    respond(200, ['ok' => true]);
}

$name    = line(field('name'));
$email   = line(field('email'));
$company = line(field('company'));
$message = trim(mb_substr(str_replace("\r\n", "\n", field('message')), 0, MAX_MESSAGE, 'UTF-8'));
$lang    = line(field('lang'), 5) === 'en' ? 'en' : 'pl';

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[^\x20-\x7E]/', $email)) {
    respond(422, ['ok' => false, 'error' => 'email']);
}
if ($name === '' && $message === '') {
    respond(422, ['ok' => false, 'error' => 'empty']);
}

$stamp = date('Y-m-d H:i');
$ip    = line((string)($_SERVER['REMOTE_ADDR'] ?? ''), 64);
$ua    = line((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 200);
$page  = line((string)($_SERVER['HTTP_REFERER'] ?? ''), 300);

$subject = 'Formularz cosgral.pl — ' . ($name !== '' ? $name : $email);
$subjectHeader = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$fromHeader = '=?UTF-8?B?' . base64_encode(CONTACT_FROM_NAME) . '?= <' . CONTACT_FROM . '>';

$body = implode("\n", [
    'Nowa wiadomość z formularza kontaktowego cosgral.pl',
    '',
    'Imię:       ' . ($name !== '' ? $name : '—'),
    'Email:      ' . $email,
    'Firma:      ' . ($company !== '' ? $company : '—'),
    'Język:      ' . $lang,
    '',
    'Wiadomość:',
    $message !== '' ? $message : '—',
    '',
    '— ' . $stamp . ' · IP ' . $ip,
    $page !== '' ? '   strona: ' . $page : '',
    $ua !== '' ? '   UA: ' . $ua : '',
    '',
]);

$headers = [
    'From: ' . $fromHeader,
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: cosgral-contact/1.0',
];

$headerStr = implode("\r\n", $headers);
// -f ustawia envelope sender (SPF/bounce); część hostingów blokuje 5. parametr — wtedy bez niego.
$sent = @mail(CONTACT_TO, $subjectHeader, $body, $headerStr, '-f' . CONTACT_FROM)
    || @mail(CONTACT_TO, $subjectHeader, $body, $headerStr);

if (!$sent) {
    error_log('[cosgral contact] mail() failed for ' . $email);
    respond(502, ['ok' => false, 'error' => 'send']);
}

respond(200, ['ok' => true]);
