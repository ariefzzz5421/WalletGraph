"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Core } from "cytoscape";
import { CHAINS, type Chain } from "@/lib/chains";
import type { GraphEdge, GraphNode } from "@/lib/relationships";

type WalletOption = { id:string; name:string; address:string; chain:Chain };
type GraphData = { nodes:GraphNode[]; edges:GraphEdge[]; sampled:boolean; coverage:string };
type Filters = { hops:1|2|3; days:"7"|"30"|"90"|"all"; minCount:number; eventType:""|"TRANSFER"|"NFT_TRANSFER" };
const initialFilters:Filters={hops:1,days:"30",minCount:1,eventType:""};

export function NetworkGraph({wallets,initialWalletId}:{wallets:WalletOption[];initialWalletId?:string}) {
  const [walletId,setWalletId]=useState(initialWalletId&&wallets.some(w=>w.id===initialWalletId)?initialWalletId:wallets[0]?.id??"");
  const [filters,setFilters]=useState<Filters>(initialFilters);
  const [graph,setGraph]=useState<GraphData|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [expanding,setExpanding]=useState(false);
  const [error,setError]=useState("");
  const [expanded,setExpanded]=useState<Set<string>>(new Set());
  const expandedRef=useRef<Set<string>>(new Set());
  const expandingRef=useRef(false);
  const generationRef=useRef(0);
  const containerRef=useRef<HTMLDivElement|null>(null);
  const cyRef=useRef<Core|null>(null);
  const activeWallet=wallets.find(w=>w.id===walletId)??wallets[0];
  const activeChain=activeWallet?.chain;

  const graphUrl=useCallback((address:string,hops:number,limit:number)=>{
    if(!activeChain)return "";
    const params=new URLSearchParams({chain:activeChain,address,hops:String(hops),days:filters.days,minCount:String(filters.minCount),limit:String(limit)});
    if(filters.eventType)params.set("eventType",filters.eventType);
    return `/api/graph?${params}`;
  },[activeChain,filters]);

  useEffect(()=>{
    if(!activeWallet)return;
    const controller=new AbortController();
    generationRef.current+=1;
    setLoading(true);setError("");setGraph(null);setSelected(`${activeWallet.chain}:${activeWallet.address}`);setExpanded(new Set());expandedRef.current=new Set();
    fetch(graphUrl(activeWallet.address,filters.hops,500),{signal:controller.signal})
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error??"Graph unavailable");return data as GraphData;})
      .then(data=>setGraph(data))
      .catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"Graph unavailable");})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[activeWallet,filters.hops,graphUrl]);

  const expand=useCallback(async(address:string)=>{
    if(!activeChain||expandedRef.current.has(address)||expandingRef.current)return;
    const generation=generationRef.current;
    expandingRef.current=true;setExpanding(true);setError("");
    try{
      const response=await fetch(graphUrl(address,1,200));
      const data=await response.json() as GraphData & {error?:string};
      if(!response.ok)throw new Error(data.error??"Could not expand node");
      if(generation!==generationRef.current)return;
      setGraph(current=>{
        if(!current)return data;
        const nodes=new Map(current.nodes.map(node=>[node.id,node]));
        const edges=new Map(current.edges.map(edge=>[edge.id,edge]));
        data.nodes.forEach(node=>{if(!nodes.has(node.id))nodes.set(node.id,node);});
        data.edges.forEach(edge=>edges.set(edge.id,edge));
        return {...current,nodes:[...nodes.values()].slice(0,1200),edges:[...edges.values()].slice(0,600),sampled:current.sampled||data.sampled};
      });
      expandedRef.current.add(address);setExpanded(new Set(expandedRef.current));
    }catch(reason){setError(reason instanceof Error?reason.message:"Could not expand node");}
    finally{expandingRef.current=false;setExpanding(false);}
  },[activeChain,graphUrl]);

  useEffect(()=>{
    if(!containerRef.current||!graph)return;
    let disposed=false;
    import("cytoscape").then(({default:cytoscape})=>{
      if(disposed||!containerRef.current)return;
      cyRef.current?.destroy();
      const elements=[
        ...graph.nodes.map(node=>({data:{id:node.id,label:node.label,address:node.address,kind:node.kind,depth:node.depth}})),
        ...graph.edges.map(edge=>({data:{id:edge.id,source:edge.source,target:edge.target,type:edge.eventType,count:edge.count}}))
      ];
      const cy=cytoscape({
        container:containerRef.current,
        elements,
        layout:{name:"concentric",concentric:node=>4-Number(node.data("depth")),levelWidth:()=>1,animate:false,padding:44,minNodeSpacing:27},
        style:[
          {selector:"node",style:{"background-color":"#60736c","border-width":1,"border-color":"#9aada2",label:"data(label)",color:"#b7c8bf","font-family":"IBM Plex Mono, monospace","font-size":9,"text-margin-y":-18,"text-outline-width":2,"text-outline-color":"#101618",width:18,height:18}},
          {selector:'node[kind = "tracked"]',style:{"background-color":"#c5ed89","border-color":"#c5ed89",color:"#e9eeeb",width:25,height:25}},
          {selector:'node[depth = 0]',style:{"background-color":"#c5ed89","border-color":"#e7ffd0","border-width":3,width:38,height:38,"font-size":11,"font-weight":700}},
          {selector:"edge",style:{width:1.2,"line-color":"#47635e","target-arrow-color":"#47635e","target-arrow-shape":"triangle","arrow-scale":.7,"curve-style":"bezier",opacity:.7}},
          {selector:'edge[type = "NFT_TRANSFER"]',style:{"line-color":"#9b82c2","target-arrow-color":"#9b82c2"}},
          {selector:"node:selected",style:{"border-color":"#ffffff","border-width":3,"overlay-opacity":0}},
          {selector:"edge:selected",style:{width:3,opacity:1}}
        ],
        minZoom:.12,maxZoom:3,wheelSensitivity:.22,
        textureOnViewport:true,motionBlur:false
      });
      cy.on("tap","node",event=>{
        const address=String(event.target.data("address"));
        setSelected(String(event.target.id()));
        void expand(address);
      });
      cyRef.current=cy;
    }).catch(()=>setError("Graph renderer could not load"));
    return ()=>{disposed=true;cyRef.current?.destroy();cyRef.current=null;};
  },[graph,expand]);

  const selectedNode=useMemo(()=>graph?.nodes.find(node=>node.id===selected)??null,[graph,selected]);
  const selectedEdges=useMemo(()=>graph?.edges.filter(edge=>edge.source===selected||edge.target===selected).sort((a,b)=>b.count-a.count)??[],[graph,selected]);
  if(!wallets.length)return <div className="empty-state"><span className="empty-icon">◇</span><h3>No graph seed yet</h3><p>Track a wallet and sync its activity to build an observed relationship network.</p><Link prefetch={false} className="button primary" href="/wallets">Add a wallet →</Link></div>;
  return <div className="graph-layout"><section className="graph-main"><div className="graph-toolbar"><label>SEED WALLET<select value={walletId} onChange={e=>setWalletId(e.target.value)}>{wallets.map(wallet=><option value={wallet.id} key={wallet.id}>{wallet.name} · {CHAINS[wallet.chain].label}</option>)}</select></label><label>HOPS<select value={filters.hops} onChange={e=>setFilters(f=>({...f,hops:Number(e.target.value) as 1|2|3}))}><option value={1}>1 hop</option><option value={2}>2 hops</option><option value={3}>3 hops</option></select></label><label>TIME RANGE<select value={filters.days} onChange={e=>setFilters(f=>({...f,days:e.target.value as Filters["days"]}))}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="all">All indexed</option></select></label><label>TYPE<select value={filters.eventType} onChange={e=>setFilters(f=>({...f,eventType:e.target.value as Filters["eventType"]}))}><option value="">All transfers</option><option value="TRANSFER">Token / native</option><option value="NFT_TRANSFER">NFT</option></select></label><label>MIN. EVENTS<input type="number" min={1} max={100} value={filters.minCount} onChange={e=>setFilters(f=>({...f,minCount:Math.max(1,Math.min(100,Number(e.target.value)||1))}))}/></label></div><div className="graph-stage"><div ref={containerRef} className="graph-canvas" role="img" aria-label="Interactive wallet transfer network"/>{loading&&<div className="graph-overlay">Loading observed relationships…</div>}{!loading&&graph&&graph.edges.length===0&&<div className="graph-empty">No matching transfers in indexed activity. Try a wider time range or sync more wallets.</div>}<div className="graph-controls"><button onClick={()=>cyRef.current?.zoom(cyRef.current.zoom()*1.25)} aria-label="Zoom in">+</button><button onClick={()=>cyRef.current?.zoom(cyRef.current.zoom()*.8)} aria-label="Zoom out">−</button><button onClick={()=>cyRef.current?.fit(undefined,40)} aria-label="Fit graph">⌖</button></div></div><div className="graph-status"><span>{graph?.nodes.length??0} NODES · {graph?.edges.length??0} EDGES</span><span>{expanding?"EXPANDING…":graph?.sampled?"RECENT EVENT SAMPLE · LIMIT REACHED":"INDEXED EVENTS ONLY"}</span></div>{error&&<div className="notice error" role="alert">{error}</div>}{graph?.sampled&&<div className="notice">A busy address exceeded the 5,000 event sample for one hop. This view is partial; adjust filters or track the counterparty to inspect more activity.</div>}</section><aside className="graph-inspector"><div className="panel-heading"><div><span className="eyebrow">NODE INSPECTOR</span><h2>{selectedNode?.label??"Select a node"}</h2></div></div>{selectedNode?<div className="inspector-body"><div className="inspector-address mono">{selectedNode.address}</div><div className="inspector-chips"><span className="chain-badge">{CHAINS[selectedNode.chain].label}</span><span className="status-badge">{selectedNode.kind==="tracked"?"Tracked":"Counterparty"}</span></div><p className="field-help">{graph?.coverage}</p><div className="inspector-actions">{selectedNode.walletId?<Link prefetch={false} className="button secondary" href={`/wallets/${selectedNode.walletId}`}>Wallet profile ↗</Link>:<Link prefetch={false} className="button secondary" href={`/wallets?${new URLSearchParams({chain:selectedNode.chain,address:selectedNode.address})}#add-wallet`}>Track this address ↗</Link>}<button className="button secondary" disabled={expanding} onClick={()=>void expand(selectedNode.address)}>{expanding?"Loading…":expanded.has(selectedNode.address)?"Expanded":"Expand neighbors"}</button></div><h3>Observed edges <span>{selectedEdges.length}</span></h3>{selectedEdges.length?<div className="inspector-edges">{selectedEdges.slice(0,20).map(edge=><div className="inspector-edge" key={edge.id}><strong>{edge.eventType==="NFT_TRANSFER"?"NFT transfer":"Transfer"} · {edge.count} events</strong><span className="mono">{edge.source===selected?"Sent to":"Received from"} {(edge.source===selected?edge.target:edge.source).split(":").slice(1).join(":").slice(0,10)}…</span><small>{new Date(edge.lastSeen).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric"})}</small>{edge.evidence[0]&&<a className="text-link" target="_blank" rel="noopener noreferrer" href={`${CHAINS[selectedNode.chain].explorer}${edge.evidence[0]}`}>View evidence ↗</a>}</div>)}</div>:<p className="muted">No observed edges for this node in the current filters.</p>}</div>:<p className="inspector-placeholder">Select a wallet or counterparty to see transaction evidence.</p>}</aside></div>;
}
