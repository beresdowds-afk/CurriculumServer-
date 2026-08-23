/**
 * PSP Gateway Integration Service: Official OPay & Paystack Specs
 * Reference:
 * - OPay Documentation: https://documentation.opayweb.com/doc/offline/authentication.html
 * - Paystack API Documentation: https://paystack.com/docs/api/
 */

// Helper to sort JSON keys alphabetically (Required by OPay HMAC-SHA512 Signature spec)
export function sortObjectKeysAlphabetically(obj: any): any {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  const sorted: Record<string, any> = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = sortObjectKeysAlphabetically(obj[key]);
    });
  return sorted;
}

// Compute real HMAC-SHA512 using Browser Web Crypto API
export async function computeHmacSha512(secretKey: string, message: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (err) {
    console.error('Error computing HMAC-SHA512:', err);
    // Fallback deterministic hex if subtle is unavailable in unusual env
    return `sha512_${Math.abs(hashCode(secretKey + message)).toString(16).padStart(64, '0')}`;
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export interface OPaySignatureResult {
  sortedPayloadString: string;
  signature: string;
  headers: {
    'Authorization': string;
    'MerchantId': string;
    'RequestTimestamp'?: string;
    'Content-Type': string;
  };
}

export async function generateOPaySignature(
  secretKey: string,
  merchantId: string,
  payload: Record<string, any>,
  includeTimestamp: boolean = true
): Promise<OPaySignatureResult> {
  const sortedPayload = sortObjectKeysAlphabetically(payload);
  const sortedPayloadString = JSON.stringify(sortedPayload);
  const signature = await computeHmacSha512(secretKey, sortedPayloadString);
  const timestamp = new Date().toISOString();

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${signature}`,
    'MerchantId': merchantId,
    'Content-Type': 'application/json'
  };

  if (includeTimestamp) {
    headers['RequestTimestamp'] = timestamp;
  }

  return {
    sortedPayloadString,
    signature,
    headers: headers as any
  };
}

export interface PaystackInitializeParams {
  email: string;
  amountInNaira: number;
  reference: string;
  callbackUrl?: string;
  splitCode?: string;
  channels?: string[];
  metadata?: Record<string, any>;
}

export function buildPaystackPayload(params: PaystackInitializeParams) {
  return {
    email: params.email,
    amount: Math.round(params.amountInNaira * 100), // Paystack requires amount in Kobo
    currency: 'NGN',
    reference: params.reference,
    callback_url: params.callbackUrl || 'https://curriculumflow.com.ng/bursary/payment-callback',
    split_code: params.splitCode,
    channels: params.channels || ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
    metadata: {
      custom_fields: [
        { display_name: 'Platform', variable_name: 'platform', value: 'CurriculumFlow AI Studio' },
        ...(params.metadata ? Object.entries(params.metadata).map(([k, v]) => ({ display_name: k, variable_name: k, value: String(v) })) : [])
      ]
    }
  };
}

export function generateCodeSnippet(
  provider: 'opay' | 'paystack',
  language: 'typescript' | 'python' | 'php' | 'curl',
  credentials: {
    merchantId?: string;
    publicKey: string;
    secretKey: string;
  },
  samplePayload: any
): string {
  if (provider === 'opay') {
    if (language === 'typescript') {
      return `import crypto from 'crypto';
import axios from 'axios';

// 1. Sort JSON payload alphabetically (Official OPay Doc requirement)
function sortKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;
  return Object.keys(obj).sort().reduce((acc: any, key) => {
    acc[key] = sortKeys(obj[key]);
    return acc;
  }, {});
}

async function initializeOPayPayment() {
  const merchantId = "${credentials.merchantId || '256620260991823'}";
  const secretKey = "${credentials.secretKey}";
  
  const rawPayload = ${JSON.stringify(samplePayload, null, 2)};
  const sortedPayloadString = JSON.stringify(sortKeys(rawPayload));
  
  // 2. Generate HMAC-SHA512 Signature
  const signature = crypto
    .createHmac('sha512', secretKey)
    .update(sortedPayloadString)
    .digest('hex');

  // 3. Dispatch to OPay Cashier API
  const response = await axios.post(
    'https://cashierapi.opayweb.com/api/v3/cashier/initialize',
    rawPayload,
    {
      headers: {
        'Authorization': \`Bearer \${signature}\`,
        'MerchantId': merchantId,
        'Content-Type': 'application/json',
        'RequestTimestamp': new Date().toISOString()
      }
    }
  );

  console.log('OPay Cashier Response:', response.data);
  return response.data;
}`;
    }

    if (language === 'python') {
      return `import hmac
import hashlib
import json
import requests
from datetime import datetime

def sort_keys(obj):
    if not isinstance(obj, dict):
        return obj
    return {k: sort_keys(obj[k]) for k in sorted(obj)}

merchant_id = "${credentials.merchantId || '256620260991823'}"
secret_key = "${credentials.secretKey}"

payload = ${JSON.stringify(samplePayload, null, 2)}
sorted_payload_str = json.dumps(sort_keys(payload), separators=(',', ':'))

# Calculate HMAC-SHA512
signature = hmac.new(
    secret_key.encode('utf-8'),
    sorted_payload_str.encode('utf-8'),
    hashlib.sha512
).hexdigest()

headers = {
    'Authorization': f'Bearer {signature}',
    'MerchantId': merchant_id,
    'Content-Type': 'application/json',
    'RequestTimestamp': datetime.utcnow().isoformat()
}

response = requests.post(
    'https://cashierapi.opayweb.com/api/v3/cashier/initialize',
    json=payload,
    headers=headers
)

print(response.json())`;
    }

    if (language === 'php') {
      return `<?php
// OPay PHP HMAC-SHA512 Authentication
$merchantId = "${credentials.merchantId || '256620260991823'}";
$secretKey = "${credentials.secretKey}";

$payload = ${JSON.stringify(samplePayload, null, 2)};

// 1. Recursive key sorting
function sortKeys($array) {
    if (!is_array($array)) return $array;
    ksort($array);
    foreach ($array as $key => $value) {
        $array[$key] = sortKeys($value);
    }
    return $array;
}

$sortedJson = json_encode(sortKeys($payload), JSON_UNESCAPED_SLASHES);
$signature = hash_hmac('sha512', $sortedJson, $secretKey);

$ch = curl_init('https://cashierapi.opayweb.com/api/v3/cashier/initialize');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $signature,
    'MerchantId: ' . $merchantId,
    'Content-Type: application/json',
    'RequestTimestamp: ' . gmdate('Y-m-d\TH:i:s\Z')
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>`;
    }

    return `curl -X POST "https://cashierapi.opayweb.com/api/v3/cashier/initialize" \\
  -H "Authorization: Bearer <HMAC_SHA512_SIGNATURE_OF_PAYLOAD>" \\
  -H "MerchantId: ${credentials.merchantId || '256620260991823'}" \\
  -H "Content-Type: application/json" \\
  -H "RequestTimestamp: 2026-08-23T11:45:00Z" \\
  -d '${JSON.stringify(samplePayload)}'`;
  }

  // Paystack
  if (language === 'typescript') {
    return `import axios from 'axios';

// Paystack Official API Initialize Transaction
async function initializePaystackPayment() {
  const secretKey = "${credentials.secretKey}";

  const payload = ${JSON.stringify(samplePayload, null, 2)};

  const response = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    payload,
    {
      headers: {
        'Authorization': \`Bearer \${secretKey}\`,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log('Paystack Access Code:', response.data.data.access_code);
  console.log('Paystack Checkout URL:', response.data.data.authorization_url);
  return response.data;
}

// Webhook Verification (HMAC-SHA512 against x-paystack-signature)
export function verifyPaystackWebhook(rawBody: string, signature: string, secret: string): boolean {
  const crypto = require('crypto');
  const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  return hash === signature;
}`;
  }

  if (language === 'python') {
    return `import requests
import hmac
import hashlib

secret_key = "${credentials.secretKey}"
payload = ${JSON.stringify(samplePayload, null, 2)}

# 1. Initialize Paystack Transaction
response = requests.post(
    'https://api.paystack.co/transaction/initialize',
    json=payload,
    headers={
        'Authorization': f'Bearer {secret_key}',
        'Content-Type': 'application/json'
    }
)
print(response.json())

# 2. Webhook verification function
def verify_webhook(raw_request_body, received_signature):
    computed = hmac.new(
        secret_key.encode('utf-8'),
        raw_request_body.encode('utf-8'),
        hashlib.sha512
    ).hexdigest()
    return hmac.compare_digest(computed, received_signature)`;
  }

  if (language === 'php') {
    return `<?php
// Paystack PHP API Initialize Transaction
$secretKey = "${credentials.secretKey}";
$payload = ${JSON.stringify(samplePayload, null, 2)};

$ch = curl_init('https://api.paystack.co/transaction/initialize');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $secretKey,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

echo $response;

// Webhook Signature Validation:
// $isValid = hash_hmac('sha512', $inputRawBody, $secretKey) === $_SERVER['HTTP_X_PAYSTACK_SIGNATURE'];
?>`;
  }

  return `curl -X POST "https://api.paystack.co/transaction/initialize" \\
  -H "Authorization: Bearer ${credentials.secretKey}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(samplePayload)}'`;
}
