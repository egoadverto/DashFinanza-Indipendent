import type {
  Nodo,
  Titolo,
  TagDefinizione,
  VNodoValore,
  VPosizioni,
  VUltimoPrezzo,
  ModoTarget,
  TargetUnita,
  StatoNodo,
  CategoriaTitolo,
} from '../types/domain'

export interface TreeNode {
  id: string
  tipo: 'portafoglio' | 'tag' | 'titolo'
  parentId: string | null
  ordine: number
  nome: string
  isin: string | null
  titoloId: string | null
  tagDefinizioneId: string | null
  stato: StatoNodo | null
  modoTarget: ModoTarget | null
  targetValore: number | null
  targetUnita: TargetUnita | null
  pacImporto: number | null
  pacDinamizzazione: number | null
  // Solo per i titoli: fatto esplicito, indipendente dall'importo sopra
  // (informativo). Un titolo con faPartePac=false è una posizione una
  // tantum, esclusa da Scarto, Riferimento e ribilanciamento.
  faPartePac: boolean
  note: string | null
  valore: number
  versato: number
  rendimentoCalcolabile: boolean
  plPct: number | null
  plEuro: number | null
  peso: number | null
  // Solo per obiettivo in percentuale: la stessa percentuale tradotta in
  // euro, calcolata sul totale del gruppo — normalmente l'obiettivo del
  // genitore, o il suo valore attuale se non ne ha uno; se il gruppo ha un
  // riferimento (v. sotto) è il totale implicito che farebbe tornare il
  // riferimento esattamente al proprio obiettivo. Un obiettivo in euro è un
  // versamento fisso (PAC), non un target di capitale: qui resta sempre null.
  obiettivoEuro: number | null
  scartoEuro: number | null
  scartoPunti: number | null
  // Riferimento per il ribilanciamento del gruppo: un nodo può scegliere un
  // proprio figlio (riferimentoId) come base — da quel momento il totale del
  // gruppo usato sopra non è più quello reale ma quello implicito nel
  // riferimento, quindi il suo scarto risulta sempre zero e gli altri
  // fratelli si spostano di conseguenza. eRiferimento marca il figlio scelto.
  riferimentoId: string | null
  eRiferimento: boolean
  // solo per i nodi titolo, dalla vista v_posizioni
  quantita: number | null
  prezzo: number | null
  costoMedio: number | null
  costoNoto: boolean | null
  // solo titolo: dati anagrafici del titolo collegato
  ter: number | null
  categoria: CategoriaTitolo | null
  simboloProvider: string | null
  children: TreeNode[]
}

interface AssembleInput {
  nodi: Nodo[]
  titoli: Titolo[]
  tagDefinizioni: TagDefinizione[]
  valori: VNodoValore[]
  posizioni: VPosizioni[]
  prezzi: VUltimoPrezzo[]
}

function nomeDiNodo(n: Nodo, titoli: Map<string, Titolo>, tagDefs: Map<string, TagDefinizione>): string {
  if (n.tipo === 'portafoglio') return n.nome ?? ''
  if (n.tipo === 'tag') return (n.tag_definizione_id && tagDefs.get(n.tag_definizione_id)?.nome) ?? ''
  return (n.titolo_id && titoli.get(n.titolo_id)?.nome) ?? ''
}

function plPctDi(valore: number, versato: number, calcolabile: boolean): number | null {
  if (!calcolabile || versato <= 0) return null
  return ((valore - versato) / versato) * 100
}

function plEuroDi(valore: number, versato: number, calcolabile: boolean): number | null {
  if (!calcolabile || versato <= 0) return null
  return valore - versato
}

// Un titolo senza PAC è una posizione una tantum: non c'è nulla su cui
// agire (non puoi ridurre o mettere in pausa un versamento che non esiste),
// quindi resta fuori da scarto, riferimento e ribilanciamento. Congelata e
// cripto non possono avere un PAC per definizione — controllato qui
// direttamente (non solo via faPartePac) così il calcolo resta corretto
// anche se quel campo dovesse tornare disallineato sui dati. Un portafoglio
// o TAG non ha un PAC proprio, la regola si applica solo ai nodi titolo.
export function puoPartecipareAlPac(n: TreeNode): boolean {
  if (n.tipo !== 'titolo') return true
  return n.faPartePac && n.stato !== 'congelata' && n.categoria !== 'cripto'
}

export function assembleTree({ nodi: nodiGrezzi, titoli, tagDefinizioni, valori, posizioni, prezzi }: AssembleInput): TreeNode[] {
  // Una posizione venduta interamente sparisce dall'albero e ricompare
  // nella sezione "Posizioni chiuse" (vedi usePosizioniChiuse).
  const nodi = nodiGrezzi.filter((n) => !(n.tipo === 'titolo' && n.stato === 'chiusa'))
  const titoliMap = new Map(titoli.map((t) => [t.id, t]))
  const tagDefsMap = new Map(tagDefinizioni.map((t) => [t.id, t]))
  const valoriMap = new Map(valori.map((v) => [v.nodo_id as string, v]))
  const posizioniMap = new Map(posizioni.map((p) => [p.nodo_id as string, p]))
  const prezziMap = new Map(prezzi.map((p) => [p.titolo_id as string, p]))

  const byId = new Map<string, TreeNode>()
  for (const n of nodi) {
    const v = valoriMap.get(n.id)
    const p = n.tipo === 'titolo' ? posizioniMap.get(n.id) : undefined
    const prezzo = n.titolo_id ? prezziMap.get(n.titolo_id) : undefined
    const valore = v?.valore ?? 0
    const versato = v?.versato ?? 0
    const rendimentoCalcolabile = v?.rendimento_calcolabile ?? true
    // Il TAG non ha un target proprio sul nodo: lo legge sempre dalla sua
    // definizione condivisa, così modificarla lo cambia in ogni portafoglio.
    const tagDef = n.tipo === 'tag' && n.tag_definizione_id ? tagDefsMap.get(n.tag_definizione_id) : undefined

    byId.set(n.id, {
      id: n.id,
      tipo: n.tipo as TreeNode['tipo'],
      parentId: n.parent_id,
      ordine: n.ordine,
      nome: nomeDiNodo(n, titoliMap, tagDefsMap),
      isin: n.titolo_id ? (titoliMap.get(n.titolo_id)?.isin ?? null) : null,
      titoloId: n.titolo_id,
      tagDefinizioneId: n.tag_definizione_id,
      stato: n.stato as StatoNodo | null,
      modoTarget: tagDef ? (tagDef.modo_target as ModoTarget) : (n.modo_target as ModoTarget | null),
      targetValore: tagDef ? tagDef.target_percentuale : n.target_valore,
      targetUnita: tagDef ? 'percentuale' : (n.target_unita as TargetUnita | null),
      pacImporto: n.pac_importo,
      pacDinamizzazione: n.pac_dinamizzazione,
      faPartePac: n.fa_parte_pac,
      note: n.note,
      valore,
      versato,
      rendimentoCalcolabile,
      plPct: plPctDi(valore, versato, rendimentoCalcolabile),
      plEuro: plEuroDi(valore, versato, rendimentoCalcolabile),
      peso: null, // calcolato in un secondo passaggio, serve il valore del padre
      obiettivoEuro: null, // idem
      scartoEuro: null, // idem
      scartoPunti: null, // idem
      riferimentoId: n.riferimento_id,
      eRiferimento: false,
      quantita: p?.quantita ?? null,
      prezzo: prezzo?.prezzo ?? null,
      costoMedio: p?.costo_medio ?? null,
      costoNoto: p?.costo_noto ?? null,
      ter: n.titolo_id ? (titoliMap.get(n.titolo_id)?.ter ?? null) : null,
      categoria: n.titolo_id ? ((titoliMap.get(n.titolo_id)?.categoria as CategoriaTitolo) ?? null) : null,
      simboloProvider: n.titolo_id ? (titoliMap.get(n.titolo_id)?.simbolo_provider ?? null) : null,
      children: [],
    })
  }

  const roots: TreeNode[] = []
  for (const n of nodi) {
    const node = byId.get(n.id)!
    if (n.parent_id && byId.has(n.parent_id)) {
      byId.get(n.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const ordina = (list: TreeNode[]) => {
    list.sort((a, b) => a.ordine - b.ordine)
    list.forEach((n) => ordina(n.children))
  }
  ordina(roots)

  const calcolaPeso = (list: TreeNode[], valorePadre: number) => {
    for (const node of list) {
      node.peso = valorePadre > 0 ? (node.valore / valorePadre) * 100 : 0
      calcolaPeso(node.children, node.valore)
    }
  }
  calcolaPeso(
    roots,
    roots.reduce((s, r) => s + r.valore, 0),
  )

  // Obiettivo in euro e scarto: un target percentuale si legge sempre
  // rispetto al totale del gruppo — l'obiettivo del genitore, o il suo
  // valore attuale se non ne ha uno — stesso criterio già usato dal
  // ribilanciamento, calcolato qui una sola volta e riusato anche lì.
  //
  // Se il genitore ha scelto un figlio come riferimento, il totale del
  // gruppo non è più quello reale: è il totale implicito che farebbe
  // tornare il riferimento esattamente al proprio obiettivo dichiarato
  // (valore del riferimento diviso la sua percentuale). Così il riferimento
  // risulta sempre a scarto zero, e ogni fratello si sposta di conseguenza —
  // è il modo di dire "considera questo già a obiettivo, quanto sono avanti
  // o indietro gli altri rispetto a lì".
  const calcolaObiettivoEuro = (list: TreeNode[], baseGenitore: number) => {
    for (const node of list) {
      if (
        puoPartecipareAlPac(node) &&
        node.modoTarget === 'stabilito' &&
        node.targetUnita === 'percentuale' &&
        node.targetValore != null
      ) {
        node.obiettivoEuro = (baseGenitore * node.targetValore) / 100
        node.scartoEuro = node.valore - node.obiettivoEuro
        node.scartoPunti = baseGenitore > 0 ? (node.scartoEuro / baseGenitore) * 100 : null
      }

      let baseFigli = node.obiettivoEuro ?? node.valore
      const riferimento = node.riferimentoId ? node.children.find((c) => c.id === node.riferimentoId) : undefined
      if (
        riferimento &&
        puoPartecipareAlPac(riferimento) &&
        riferimento.modoTarget === 'stabilito' &&
        riferimento.targetUnita === 'percentuale' &&
        riferimento.targetValore
      ) {
        riferimento.eRiferimento = true
        baseFigli = riferimento.valore / (riferimento.targetValore / 100)
      }
      calcolaObiettivoEuro(node.children, baseFigli)
    }
  }
  const capitaleTotale = roots.reduce((s, r) => s + r.valore, 0)
  calcolaObiettivoEuro(roots, capitaleTotale)

  return roots
}

// Cerca un nodo per id in tutto l'albero: serve a trovaFratelli, contaFigli,
// unitaFratelli e a chi deve rileggere un nodo aggiornato dopo una mutazione.
export function trovaNodo(roots: TreeNode[], id: string): TreeNode | null {
  for (const n of roots) {
    if (n.id === id) return n
    const trovato = trovaNodo(n.children, id)
    if (trovato) return trovato
  }
  return null
}

// L'elenco dei fratelli di un nodo (i figli di un genitore, o le radici se
// parentId è null): serve al drag&drop per riordinare, che si limita sempre
// allo stesso livello.
export function trovaFratelli(roots: TreeNode[], parentId: string | null): TreeNode[] {
  if (parentId === null) return roots
  return trovaNodo(roots, parentId)?.children ?? []
}

// Numero di figli diretti di un nodo (o di radici, se parentId è null):
// serve per mettere un duplicato o un nuovo elemento in coda ai fratelli.
export function contaFigli(roots: TreeNode[], parentId: string | null): number {
  if (parentId === null) return roots.length
  return trovaNodo(roots, parentId)?.children.length ?? 0
}

export interface ContenitoreOpzione {
  id: string
  nome: string
  parentId: string | null
  tipo: 'portafoglio' | 'tag'
}

// Solo portafoglio e tag possono contenere figli: un titolo non compare mai
// come possibile nodo padre.
export function flattenContenitori(roots: TreeNode[]): ContenitoreOpzione[] {
  const risultato: ContenitoreOpzione[] = []
  const visita = (nodi: TreeNode[]) => {
    for (const n of nodi) {
      if (n.tipo === 'portafoglio' || n.tipo === 'tag') {
        risultato.push({ id: n.id, nome: n.nome, parentId: n.parentId, tipo: n.tipo })
        visita(n.children)
      }
    }
  }
  visita(roots)
  return risultato
}

// Un nodo e tutti i suoi discendenti: serve a evitare di poterlo spostare
// dentro se stesso quando si sceglie il nuovo nodo padre in modifica.
export function sottoAlberoIds(nodo: TreeNode): Set<string> {
  const ids = new Set<string>([nodo.id])
  const visita = (figli: TreeNode[]) => {
    for (const f of figli) {
      ids.add(f.id)
      visita(f.children)
    }
  }
  visita(nodo.children)
  return ids
}

export interface TitoloOpzione {
  id: string
  nome: string
  isin: string | null
  categoria: CategoriaTitolo | null
  percorso: string
}

// Nodi titolo (posizioni), con il percorso dei portafogli/TAG che li
// contengono: serve a distinguere lo stesso titolo replicato in più
// portafogli quando si sceglie a quale registrare una transazione.
export function flattenTitoli(roots: TreeNode[]): TitoloOpzione[] {
  const risultato: TitoloOpzione[] = []
  const visita = (nodi: TreeNode[], percorso: string[]) => {
    for (const n of nodi) {
      if (n.tipo === 'titolo') {
        risultato.push({ id: n.id, nome: n.nome, isin: n.isin, categoria: n.categoria, percorso: percorso.join(' › ') })
      } else {
        visita(n.children, [...percorso, n.nome])
      }
    }
  }
  visita(roots, [])
  return risultato
}

// Il percorso (nomi degli antenati, dalla radice) di un nodo qualsiasi:
// serve al pannello di dettaglio per mostrare "dove si trova" un nodo.
export function percorsoNodo(roots: TreeNode[], nodoId: string): string[] {
  function cerca(nodi: TreeNode[], percorso: string[]): string[] | null {
    for (const n of nodi) {
      if (n.id === nodoId) return percorso
      const trovato = cerca(n.children, [...percorso, n.nome])
      if (trovato) return trovato
    }
    return null
  }
  return cerca(roots, []) ?? []
}

// L'unità (percentuale o euro) è dei fratelli, non del nodo padre in sé:
// il primo figlio la sceglie, i successivi la ereditano.
export function unitaFratelli(roots: TreeNode[], parentId: string | null): TargetUnita | null {
  if (parentId === null) return null
  const padre = trovaNodo(roots, parentId)
  const conUnita = padre?.children.find((c) => c.targetUnita != null)
  return conUnita?.targetUnita ?? null
}
