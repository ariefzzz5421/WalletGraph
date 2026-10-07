import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeAddress } from "../src/lib/chains";
import { alertEligible, matchesRule } from "../src/lib/alerts";
import { AlchemyProvider } from "../src/lib/providers/alchemy";
import { SolanaRpcProvider } from "../src/lib/providers/solana";
import { hashPassword, verifyPassword } from "../src/lib/security";

const evmAddress="0xAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
test("chain address rules preserve Solana case and normalize EVM case",()=>{
  assert.equal(normalizeAddress("ethereum",evmAddress),evmAddress.toLowerCase());
  assert.equal(normalizeAddress("solana","11111111111111111111111111111111"),"11111111111111111111111111111111");
  assert.throws(()=>normalizeAddress("solana",evmAddress));
  assert.throws(()=>normalizeAddress("base","0xabc"));
});
test("password hashing verifies without storing plaintext",async()=>{
  const stored=await hashPassword("a-long-test-password");
  assert.ok(!stored.includes("a-long-test-password"));
  assert.equal(await verifyPassword("a-long-test-password",stored),true);
  assert.equal(await verifyPassword("wrong-password",stored),false);
});
test("USD rules fail closed when a provider has no verified price",()=>{
  const event={eventKey:"event",chain:"ethereum" as const,txHash:"0xhash",eventIndex:"1",eventType:"TRANSFER" as const,direction:"out" as const,
    fromAddress:evmAddress,toAddress:null,tokenSymbol:"ETH",tokenAddress:null,amount:"100",usdValue:null,occurredAt:new Date().toISOString(),source:"test",raw:{}};
  const rule={wallet_id:null,event_type:"TRANSFER",direction:"out",chain:"ethereum",token_symbol:"eth",min_usd:"1000"};
  assert.equal(matchesRule(rule,event,"wallet"),false);
  assert.equal(matchesRule({...rule,min_usd:null},event,"wallet"),true);
  assert.equal(matchesRule({...rule,wallet_id:"other",min_usd:null},event,"wallet"),false);
});
test("historical backfill cannot trigger real-time alerts",()=>{
  const trackedAt=new Date("2026-10-07T00:00:00.000Z");
  assert.equal(alertEligible("2026-10-06T23:59:59.000Z",trackedAt,"all"),false);
  assert.equal(alertEligible("2026-10-07T00:00:01.000Z",trackedAt,"all"),true);
  assert.equal(alertEligible("2026-10-07T00:00:01.000Z",trackedAt,"off"),false);
});
test("Alchemy transfer pages use stable event IDs and stop at requested cutoff",async()=>{
  const prior=globalThis.fetch;const priorKey=process.env.ALCHEMY_API_KEY;process.env.ALCHEMY_API_KEY="test-key";
  const calls:unknown[]=[];
  globalThis.fetch=(async (_url,options)=>{
    const body=JSON.parse(String(options?.body));calls.push(body);
    const params=body.params[0];
    return new Response(JSON.stringify({result:{transfers:[{uniqueId:"tx:external",hash:"0xhash",from:evmAddress,to:"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",value:1,asset:"ETH",category:"external",blockNum:"0x1",metadata:{blockTimestamp:"2026-01-01T00:00:00.000Z"}}],pageKey:"next-page"}}),{status:200});
  }) as typeof fetch;
  try{
    const result=await new AlchemyProvider().getActivity(evmAddress.toLowerCase(),"ethereum",undefined,new Date("2026-02-01"));
    assert.equal(result.events.length,2);
    assert.equal(result.events[0].eventKey,result.events[1].eventKey);
    assert.equal(result.nextCursor,null);
    assert.equal(result.events[0].usdValue,null);
    assert.equal(calls.length,2);
  }finally{globalThis.fetch=prior;if(priorKey===undefined)delete process.env.ALCHEMY_API_KEY;else process.env.ALCHEMY_API_KEY=priorKey;}
});
test("Solana adapter only emits parsed native transfers involving watched address",async()=>{
  const prior=globalThis.fetch;const priorUrl=process.env.SOLANA_RPC_URL;process.env.SOLANA_RPC_URL="https://example.invalid";
  const address="11111111111111111111111111111111";
  globalThis.fetch=(async (_url,options)=>{
    const {method}=JSON.parse(String(options?.body));
    const result=method==="getSignaturesForAddress"?[{signature:"signature",blockTime:1767225600}]:{blockTime:1767225600,transaction:{message:{instructions:[{program:"system",parsed:{type:"transfer",info:{source:address,destination:"22222222222222222222222222222222",lamports:1000000000}}}]}}};
    return new Response(JSON.stringify({result}),{status:200});
  }) as typeof fetch;
  try{const result=await new SolanaRpcProvider().getActivity(address,"solana");assert.equal(result.events.length,1);assert.equal(result.events[0].amount,"1");assert.equal(result.events[0].direction,"out");assert.equal(result.events[0].usdValue,null);}finally{globalThis.fetch=prior;if(priorUrl===undefined)delete process.env.SOLANA_RPC_URL;else process.env.SOLANA_RPC_URL=priorUrl;}
});
