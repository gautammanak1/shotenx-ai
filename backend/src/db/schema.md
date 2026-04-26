# Payment and Agent Storage Schema

## `data/payments.json`

```json
{
  "sessions": {
    "<checkoutId>": {
      "id": "uuid",
      "agentId": "agent_xxx",
      "buyerId": "user_xxx",
      "amountSats": 10,
      "invoice": "lnbc...",
      "paymentHash": "hex",
      "status": "pending|settled|expired|consumed|failed",
      "createdAt": "ISO",
      "expiresAt": "ISO",
      "settledAt": "ISO",
      "consumedAt": "ISO",
      "failureReason": "string",
      "requestPath": "/api/agents/auto-run",
      "requestMethod": "POST"
    }
  },
  "usedPaymentHashes": {
    "<paymentHash>": "<checkoutId>"
  },
  "logs": [
    {
      "id": "uuid",
      "checkoutId": "uuid",
      "requestPath": "/api/agents/:id/run",
      "requestMethod": "POST",
      "amountSats": 10,
      "status": "pending|settled|expired|consumed|failed",
      "event": "challenge_issued|verify_attempt|verified|reused_hash_rejected|expired|consumed|agent_autopay|failed",
      "timestamp": "ISO",
      "detail": "optional"
    }
  ]
}
```

## `src/agents/registry.json`

```json
[
  {
    "id": "agent_uuid",
    "name": "LinkedIn Writer",
    "description": "Writes social posts",
    "type": "content|image|code",
    "price": 10,
    "endpoint": "/api/agents/agent_uuid/run",
    "createdBy": "frontend-builder",
    "createdAt": "ISO",
    "usageCount": 12,
    "earningsSats": 120
  }
]
```

