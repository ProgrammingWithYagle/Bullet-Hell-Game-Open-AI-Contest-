import catalog from "../../content/catalog.json";
import { CONTENT_REVISION, PROTOCOL, type BossId } from "./protocol.ts";
import { classifiedContract } from "./boss-threat.ts";

/** Bounded local migrations preserve old Practice saves. Online signatures stay strict. */
function migrateKnownPracticeBoundary(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const issued = value as Record<string, unknown>;
  const oldPlayer=issued.player as Record<string,unknown>|undefined;
  if(issued.protocolVersion===56&&issued.contentRevision==='833b5a88a27000579adf2b9d5c12f113805d83184eb99dae71f9fba8cbf6a2fd'){
    const editionSkills=["engineer-machinery-1","engineer-traps-1","engineer-machinery-anchor-1","engineer-machinery-survey-1","engineer-machinery-coil-1","engineer-machinery-prism-1","engineer-machinery-salvage-1","engineer-machinery-convergence-1","engineer-traps-wire-1","engineer-traps-switch-1","engineer-traps-key-1","engineer-traps-casings-1","engineer-traps-haul-1","engineer-traps-corridor-1","engineer-builder-1","engineer-builder-longspan-1","engineer-builder-wings-1","engineer-builder-hinge-1","engineer-builder-repair-1","engineer-builder-linked-1","engineer-builder-survey-1","engineer-builder-redoubt-1","soldier-skirmisher-1","soldier-skirmisher-advance-1","soldier-skirmisher-rear-1","soldier-skirmisher-drill-1","soldier-skirmisher-roving-1"];
    if(issued.schemaVersion!==1||issued.practiceOnly!==true||issued.serverOnly===true||issued.players!==undefined||issued.transactions!==undefined||JSON.stringify(issued).length>32768||!oldPlayer||(Array.isArray(oldPlayer.skills)&&oldPlayer.skills.some(id=>catalog.specializationSkills.some(s=>s.id===id)&&!editionSkills.includes(String(id)))))throw Error('versionMismatch');
    return {...issued,contentRevision:CONTENT_REVISION,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===55&&issued.contentRevision==='da03a1304940cf65d0a3298fba1c5e4d84c53a199203f0e3f4c42081c9ec3de6'){
    const editionSkills=["engineer-machinery-1","engineer-traps-1","engineer-machinery-anchor-1","engineer-machinery-survey-1","engineer-machinery-coil-1","engineer-machinery-prism-1","engineer-machinery-salvage-1","engineer-machinery-convergence-1","engineer-traps-wire-1","engineer-traps-switch-1","engineer-traps-key-1","engineer-traps-casings-1","engineer-traps-haul-1","engineer-traps-corridor-1","engineer-builder-1","engineer-builder-longspan-1","engineer-builder-wings-1","engineer-builder-hinge-1","engineer-builder-repair-1","engineer-builder-linked-1","engineer-builder-survey-1","engineer-builder-redoubt-1","soldier-skirmisher-1","soldier-skirmisher-advance-1","soldier-skirmisher-rear-1"];
    if(issued.schemaVersion!==1||issued.practiceOnly!==true||issued.serverOnly===true||issued.players!==undefined||issued.transactions!==undefined||JSON.stringify(issued).length>32768||!oldPlayer||(Array.isArray(oldPlayer.skills)&&oldPlayer.skills.some(id=>catalog.specializationSkills.some(s=>s.id===id)&&!editionSkills.includes(String(id)))))throw Error('versionMismatch');
    return {...issued,contentRevision:CONTENT_REVISION,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===54&&issued.contentRevision==='d7aea7cb50f954a88d02ff12291808900bbd00d1e4445c4e0af2655168132510'){
    const editionSkills=["engineer-machinery-1","engineer-traps-1","engineer-machinery-anchor-1","engineer-machinery-survey-1","engineer-machinery-coil-1","engineer-machinery-prism-1","engineer-machinery-salvage-1","engineer-machinery-convergence-1","engineer-traps-wire-1","engineer-traps-switch-1","engineer-traps-key-1","engineer-traps-casings-1","engineer-traps-haul-1","engineer-traps-corridor-1","engineer-builder-1","engineer-builder-longspan-1","engineer-builder-wings-1","engineer-builder-hinge-1","engineer-builder-repair-1","engineer-builder-linked-1","engineer-builder-survey-1","engineer-builder-redoubt-1"];
    if(issued.schemaVersion!==1||issued.practiceOnly!==true||issued.serverOnly===true||issued.players!==undefined||issued.transactions!==undefined||JSON.stringify(issued).length>32768||!oldPlayer||(Array.isArray(oldPlayer.skills)&&oldPlayer.skills.some(id=>catalog.specializationSkills.some(s=>s.id===id)&&!editionSkills.includes(String(id)))))throw Error('versionMismatch');
    return {...issued,contentRevision:CONTENT_REVISION,protocolVersion:PROTOCOL};
  }
  if(issued.contentRevision!==CONTENT_REVISION&&Array.isArray(oldPlayer?.skills)&&oldPlayer.skills.some(id=>String(id).startsWith('engineer-builder-')))throw Error('versionMismatch');
  if(issued.protocolVersion===53&&issued.contentRevision==='2bcf8d4f883afe0a674ea23066435376c1cc97631de03dff74dadb4cfe373fea'){
    if(issued.schemaVersion!==1||issued.practiceOnly!==true||issued.serverOnly===true||issued.players!==undefined||issued.transactions!==undefined||JSON.stringify(issued).length>32768||!oldPlayer||(Array.isArray(oldPlayer.skills)&&oldPlayer.skills.some(id=>catalog.specializationSkills.some(s=>s.id===id)&&!["engineer-machinery-1","engineer-traps-1","engineer-machinery-anchor-1","engineer-machinery-survey-1","engineer-machinery-coil-1","engineer-machinery-prism-1","engineer-machinery-salvage-1","engineer-machinery-convergence-1","engineer-traps-wire-1","engineer-traps-switch-1","engineer-traps-key-1","engineer-traps-casings-1","engineer-traps-haul-1","engineer-traps-corridor-1"].includes(String(id)))))throw Error('versionMismatch');
    return {...issued,contentRevision:CONTENT_REVISION,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===52&&issued.contentRevision==='1d1292a7442e6eeab687739ce510eba46fd061ae087abd3d8ff51d2f0b7e0186'){
    if(issued.schemaVersion!==1||issued.practiceOnly!==true||issued.serverOnly===true||issued.players!==undefined||issued.transactions!==undefined||JSON.stringify(issued).length>32768||!oldPlayer||(Array.isArray(oldPlayer.skills)&&oldPlayer.skills.some(id=>catalog.specializationSkills.some(s=>s.id===id)&&!["engineer-machinery-1","engineer-traps-1","engineer-machinery-anchor-1","engineer-machinery-survey-1","engineer-machinery-coil-1","engineer-machinery-prism-1","engineer-machinery-salvage-1","engineer-machinery-convergence-1"].includes(String(id)))))throw Error('versionMismatch');
    return {...issued,contentRevision:CONTENT_REVISION,protocolVersion:PROTOCOL};
  }
  if(issued.contentRevision!==CONTENT_REVISION&&Array.isArray(oldPlayer?.skills)&&oldPlayer.skills.some(id=>['general-brake-step','general-course-correction'].includes(String(id))))throw Error('versionMismatch');
  if(issued.protocolVersion===51&&issued.contentRevision==='9b4db7927068a0b75ba0d915094354eb66102090eeed913b8d013e3c9459233f'){
    if(issued.schemaVersion!==1||issued.practiceOnly!==true||issued.serverOnly===true||issued.players!==undefined||issued.transactions!==undefined||JSON.stringify(issued).length>32768||!oldPlayer||(Array.isArray(oldPlayer.skills)&&oldPlayer.skills.some(id=>catalog.specializationSkills.some(s=>s.id===id)&&!["engineer-machinery-1","engineer-traps-1","engineer-machinery-anchor-1","engineer-machinery-survey-1","engineer-machinery-coil-1","engineer-machinery-prism-1","engineer-machinery-salvage-1","engineer-machinery-convergence-1"].includes(String(id)))))throw Error('versionMismatch');
    return {...issued,contentRevision:CONTENT_REVISION,protocolVersion:PROTOCOL};
  }
  // The issued two-pathway edition already owns its skills and chapter proofs.
  // A local safe boundary carries no live constructs; preserve that ownership.
  if([49,50].includes(issued.protocolVersion as number)&&issued.contentRevision==='a6a17f1935ebd8e91d8d5916a7c8ee920190e13bc42a07e09dec98723e94390f'){
    if(issued.schemaVersion!==1||issued.practiceOnly!==true||issued.serverOnly===true||issued.players!==undefined||issued.transactions!==undefined||JSON.stringify(issued).length>32768||!oldPlayer||(Array.isArray(oldPlayer.skills)&&oldPlayer.skills.some(id=>catalog.specializationSkills.some(s=>s.id===id)&&!['engineer-machinery-1','engineer-traps-1'].includes(String(id)))))throw Error('versionMismatch');
    return {...issued,contentRevision:CONTENT_REVISION,protocolVersion:PROTOCOL};
  }
  if(issued.contentRevision!==CONTENT_REVISION&&Array.isArray(oldPlayer?.skills)&&oldPlayer.skills.some(id=>catalog.specializationSkills.some(node=>node.id===id)))throw Error('versionMismatch');
  if(issued.protocolVersion===48&&issued.contentRevision==='1dd8789a6050eac2ca2f677bc15a8cdbfafaf78d73226d5be7cfbfc3ed70ba04'){
    const p=issued.player as Record<string,unknown>|undefined;
    if(issued.schemaVersion!==1||issued.practiceOnly!==true||issued.serverOnly===true||issued.players!==undefined||issued.transactions!==undefined||JSON.stringify(issued).length>32768||!p||(Array.isArray(p.skills)&&p.skills.some(s=>typeof s==='string'&&['engineer-machinery-1','engineer-traps-1'].includes(s))))throw Error('versionMismatch');
    return {...issued,contentRevision:CONTENT_REVISION,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===48&&issued.contentRevision==='8bda5e247f3df132a9c80f244fd8a7c2b3eaf468e2c6a8927f87a35937fbe110'){
    const p=issued.player as Record<string,unknown>|undefined;
    if(issued.schemaVersion!==1||issued.practiceOnly!==true||issued.serverOnly===true||issued.players!==undefined||issued.transactions!==undefined||JSON.stringify(issued).length>32768||!p||!['soldier','medic','heavy','tank','mage','engineer','assassin','bard','swordsman','summoner','ranger'].includes(String(p.classId))||(Array.isArray(p.skills)&&p.skills.some(s=>typeof s==='string'&&s.startsWith('alchemist-'))))throw Error('versionMismatch');
    // This issued chapter already has identity and proofs. Preserve them unchanged.
    return {...issued,contentRevision:CONTENT_REVISION,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===48&&issued.contentRevision==='f099f438f83d4f79da2fd18bc8cd680e3e8616e5febb50d7b78609b47d09bb32'){
    const p=issued.player as Record<string,unknown>|undefined;
    if(issued.schemaVersion!==1||issued.practiceOnly!==true||issued.serverOnly===true||issued.players!==undefined||issued.transactions!==undefined||JSON.stringify(issued).length>32768||!p||!['soldier','medic','heavy','tank','mage','engineer','assassin','bard','swordsman','summoner'].includes(String(p.classId))||(Array.isArray(p.skills)&&p.skills.some(s=>typeof s==='string'&&s.startsWith('ranger-'))))throw Error('versionMismatch');
    return {...issued,contentRevision:CONTENT_REVISION,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===47&&issued.contentRevision==='e74efafe14d4694ef9afd8ea6df038c3fd0e697e4b6d5039f9a6d70173c8b6bd'){
    const p=issued.player as Record<string,unknown>|undefined;
    if(issued.schemaVersion!==1||issued.practiceOnly!==true||issued.serverOnly===true||issued.players!==undefined||issued.transactions!==undefined||JSON.stringify(issued).length>32768||!p||!['soldier','medic','heavy','tank','mage','engineer','assassin','bard','swordsman'].includes(String(p.classId))||(Array.isArray(p.skills)&&p.skills.some(s=>typeof s==='string'&&s.startsWith('summoner-'))))throw Error('versionMismatch');
    return {...issued,contentRevision:CONTENT_REVISION,protocolVersion:PROTOCOL};
  }
  if (issued.protocolVersion === 47 && issued.contentRevision === '85c266d3bbb2457910b5237bbab3769bd1ada06014d39ded5eefe5854e5392cb') {
    const p = issued.player as Record<string, unknown> | undefined;
    if (issued.schemaVersion !== 1 || issued.practiceOnly !== true || issued.serverOnly === true || issued.players !== undefined || issued.transactions !== undefined || JSON.stringify(issued).length > 32768 || !p || !['soldier','medic','heavy','tank','mage','engineer','assassin','bard'].includes(String(p.classId)) || (Array.isArray(p.skills) && p.skills.some((s) => typeof s === 'string' && s.startsWith('swordsman-')))) throw Error('versionMismatch');
    // Preserve the issued eight-class chapter state; do not create a new proof.
    return {...issued, contentRevision: CONTENT_REVISION, protocolVersion:PROTOCOL};
  }
  if (issued.protocolVersion === 47 && issued.contentRevision === '5b8c858463c86d7e5d2fb70a547dd95ddcb5c38e20be547c39c4f1707e31e779') {
    const p = issued.player as Record<string, unknown> | undefined;
    if (issued.schemaVersion !== 1 || issued.practiceOnly !== true || issued.serverOnly === true || issued.players !== undefined || issued.transactions !== undefined || JSON.stringify(issued).length > 32768 || !p || !['soldier','medic','heavy','tank','mage','engineer','assassin'].includes(String(p.classId)) || (Array.isArray(p.skills) && p.skills.some((s) => typeof s === 'string' && s.startsWith('bard-'))))
      throw Error('versionMismatch');
    // This issued version already had chapter proofs. Preserve them; mint nothing.
    return { ...issued, contentRevision: CONTENT_REVISION, protocolVersion:PROTOCOL };
  }
  if(issued.contentRevision!==CONTENT_REVISION && (issued.chapter!==undefined ||
    (issued.settings && typeof issued.settings==='object' && Object.hasOwn(issued.settings,'storyChapterId'))))throw Error('versionMismatch');
  if (
    issued.protocolVersion === 47 &&
    (issued.contentRevision === "fd913548f72bfaea33f52a16821f786491d647c10677d8c8957b248c2da799db" || issued.contentRevision === "1707fd9bd432dfb24107300944b99e70bcbe8a5e05077ddebaf0c2907013a1b1" || issued.contentRevision ===
      "e80e0f1d1bd444b1c5d16fae4c7aae322b31bcac70ac180b74964f6ba0326b48" ||
      issued.contentRevision ===
        "77b0d920d24b5f96e422f6697e8346e04cc88159920954261508b30d878d0264")
  ) {
    if (
      issued.schemaVersion !== 1 ||
      issued.practiceOnly !== true ||
      issued.serverOnly === true ||
      issued.players !== undefined ||
      issued.transactions !== undefined ||
      JSON.stringify(issued).length > 32768
    )
      throw Error("versionMismatch");
    return { ...issued, contentRevision: CONTENT_REVISION, protocolVersion:PROTOCOL };
  }
  if (
    issued.protocolVersion === 47 &&
    issued.contentRevision ===
      "f464a132bbc18083c5780239f18f24ff447a5be87de3e64db22d6881e7793290"
  ) {
    if (
      issued.schemaVersion !== 1 ||
      issued.practiceOnly !== true ||
      issued.serverOnly === true ||
      issued.players !== undefined ||
      issued.transactions !== undefined ||
      JSON.stringify(issued).length > 32768
    )
      throw Error("versionMismatch");
    return { ...issued, contentRevision: CONTENT_REVISION, protocolVersion:PROTOCOL };
  }
  if (
    Number(issued.protocolVersion) <= 46 &&
    issued.settings &&
    typeof issued.settings === "object" &&
    Object.hasOwn(issued.settings, "freePlay")
  )
    throw Error("versionMismatch");
  if (
    Number(issued.protocolVersion) <= 45 &&
    issued.settings &&
    typeof issued.settings === "object" &&
    (issued.settings as Record<string, unknown>).mode === "story"
  )
    throw Error("versionMismatch");
  if (
    issued.protocolVersion === 46 &&
    issued.contentRevision ===
      "31bcd58adcfd8d9d1d76fc23b484237e68c266a513f2dedb2571f8a09067e131"
  ) {
    if (
      issued.schemaVersion !== 1 ||
      issued.practiceOnly !== true ||
      issued.serverOnly === true ||
      issued.players !== undefined ||
      issued.transactions !== undefined ||
      JSON.stringify(issued).length > 32768
    )
      throw Error("versionMismatch");
    return {
      ...issued,
      protocolVersion: PROTOCOL,
      contentRevision: CONTENT_REVISION,
    };
  }
  if (
    issued.protocolVersion === 46 &&
    issued.contentRevision ===
      "22f660b0d378316283eb081b458adcc4cd827f7465d9089ed9146ab2ac242c9c"
  ) {
    if (
      issued.schemaVersion !== 1 ||
      issued.practiceOnly !== true ||
      issued.serverOnly === true ||
      issued.players !== undefined ||
      issued.transactions !== undefined ||
      JSON.stringify(issued).length > 32768
    )
      throw Error("versionMismatch");
    return {
      ...issued,
      protocolVersion: PROTOCOL,
      contentRevision: CONTENT_REVISION,
    };
  }
  if (
    issued.protocolVersion === 45 &&
    issued.contentRevision ===
      "fd77a95b869f368f49ce988f613db276385c45843e0152c69c3c67e13683a97b"
  ) {
    if (
      issued.schemaVersion !== 1 ||
      issued.practiceOnly !== true ||
      issued.serverOnly === true ||
      issued.players !== undefined ||
      issued.transactions !== undefined ||
      JSON.stringify(issued).length > 32768
    )
      throw Error("versionMismatch");
    return {
      ...issued,
      protocolVersion: PROTOCOL,
      contentRevision: CONTENT_REVISION,
    };
  }
  if (
    issued.protocolVersion === 45 &&
    issued.contentRevision ===
      "5a4ffd871d1880ccb681aee1faa5e51a664385752977fa7a136b50d44c7c6927"
  ) {
    if (
      issued.schemaVersion !== 1 ||
      issued.practiceOnly !== true ||
      issued.serverOnly === true ||
      issued.players !== undefined ||
      issued.transactions !== undefined ||
      JSON.stringify(issued).length > 32768
    )
      throw Error("versionMismatch");
    return {
      ...issued,
      protocolVersion: PROTOCOL,
      contentRevision: CONTENT_REVISION,
    };
  }
  if (
    issued.protocolVersion === 44 &&
    [
      "39fd34dfd7530860d0ecfad5d7e86361438fae9bd3ac93881ec4fe51a3974322",
      "15da4f590d2f2041f065732e48498551543beab9818f1f187df710d5de521d34",
    ].includes(String(issued.contentRevision))
  ) {
    if (
      issued.schemaVersion !== 1 ||
      issued.practiceOnly !== true ||
      issued.serverOnly === true ||
      issued.players !== undefined ||
      issued.transactions !== undefined ||
      JSON.stringify(issued).length > 32768
    )
      throw Error("versionMismatch");
    return {
      ...issued,
      protocolVersion: PROTOCOL,
      contentRevision: CONTENT_REVISION,
    };
  }
  if (
    issued.protocolVersion === 43 ||
    issued.protocolVersion === 42 ||
    issued.protocolVersion === 41 ||
    issued.protocolVersion === 40 ||
    issued.protocolVersion === 39
  ) {
    if (
      issued.schemaVersion !== 1 ||
      (issued.contentRevision !== CONTENT_REVISION &&
        issued.contentRevision !==
          "1ae4988671b4316e028ed42c6a9cd63c2efa26f046debad2fb75b8e1fc8e7f6d") ||
      issued.practiceOnly !== true ||
      issued.serverOnly === true ||
      issued.players !== undefined ||
      issued.transactions !== undefined ||
      JSON.stringify(issued).length > 32768
    )
      throw Error("versionMismatch");
    return {
      ...issued,
      protocolVersion: PROTOCOL,
      contentRevision: CONTENT_REVISION,
    };
  }
  if (issued.protocolVersion === 38) {
    if (
      issued.schemaVersion !== 1 ||
      (issued.contentRevision !== CONTENT_REVISION &&
        issued.contentRevision !==
          "1ae4988671b4316e028ed42c6a9cd63c2efa26f046debad2fb75b8e1fc8e7f6d") ||
      issued.practiceOnly !== true ||
      issued.serverOnly === true ||
      issued.players !== undefined ||
      issued.transactions !== undefined ||
      JSON.stringify(issued).length > 32768
    )
      throw Error("versionMismatch");
    const settings = issued.settings;
    if (!settings || typeof settings !== "object" || Array.isArray(settings))
      throw Error("invalidCheckpoint");
    return {
      ...issued,
      protocolVersion: PROTOCOL,
      contentRevision: CONTENT_REVISION,
      settings: { ...settings, arenaSelection: "fixed" },
    };
  }
  // Carry known issued local content revisions forward, preserving their identity and progress.
  // The existing version-specific and full restore validation still apply.
  // Current-version cards never pass through legacy reclassification.
  const compatibleRevision =
    [
      "6bf9b3f3f87c98e2e552b99e4dbf6ae856b57b3aba032d03a72bcc97c8367cdd",
      "6f97c9a4f3aabc87e6875b99e18aba60f667335d501ec50e94d215a1f8bc806c",
      "7266df2511e22b94f34915a97c0b4a61e2881778de5cfddff4011a41c2f29fe2",
      "94552a8007ad25febb2f9c8e212ffdf28360bcb1df528a7c7ab226f7388ee675",
      "0d8d0df4d5bd156da29529164a249489dcb3f3dbdda7026921bcc76555eb6266",
      "b6cdeb5a0d7475f65192d16f26a91d31660e9593843704738e1ddf494f5191bb",
      "90c1bd18708bffd5fab92a98490b9f173ba4cdb85956aabda8fef67c4cd6c28d",
      "850f5e0dd38cfd283ff0dbf079892b3595ccc489a95c70586e4fd4a24505402b",
      "e6db0059a1510315047e400e2c135ca2fd3a0368cea21c035946ff6a877631b2",
      "39ca64136ddb477d344eb75408a22ed239af57efb1d3a3a4f5893ac33c13864d",
      "b6d1eca2e4cc89073c4e45a5007b4e39ff98bc30ba98337782777170210a0438",
      "cc48fbf30b18e546d600b05f4c4648330cfd012631c53fd7a4fe57b734b7a97b",
      "a36ec57bba4b76a595d42ac812c69bbda0ab2305ea22cf131b1770e03a57d9d2",
      "27c4b2e298912b53f88b115654857f923966aeccdb80b730e449536a2045ef27",
      "da37e2a0e2beb54343495ce39027211df254fa1c79ab42ec3f3360373ad792db",
      "9598869248912ad6a787d6e72791183acf4e12d38da92f2a677164f93e3f51c7",
      "312aa30276cffb7bb00cf9a303cc3b3461cce80d32e054afd5e91c08f76e2006",
      "86ace79844ae1abe21b7fa54d18fa2de1f4316a2b5a0578c1878e6b27479ffdf",
      "82763fd1f5288303f8170a798b656f5443fc8f5236b652786a9e3b27070c41af",
      "b8d9fb6918c854f3eed38b327ed0cb3026e071e6fe24932e50beed36943db241",
      "43b7b2848b50bbe56072bfa134e5775355a7faca28092624744bdae6a0d318bb",
      "cbb6b8e68c9fb6f3191a3f0ef4a6411c8a3d3e41e3aeca783c122b07ab73d546",
      "1ad00eee45a117a45929e56884c6a39a8c4eb614b0728ab31e847403fb8735bb",
      "d4419d906f67286576ca3f6795e03a921269aff861b36e2e82ce68aa2e501775",
      "535eb34c7cdabce5ad2fe910ea0a792278a7cc08e360b4f5712d7ee2d9e767f6",
    ].includes(issued.contentRevision as string) &&
    [
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32,
      33,
      34,
      35,
      36,
      37,
      PROTOCOL,
    ].includes(issued.protocolVersion as number) &&
    issued.schemaVersion === 1 &&
    issued.practiceOnly === true &&
    issued.serverOnly !== true &&
    issued.players === undefined &&
    issued.transactions === undefined &&
    JSON.stringify(issued).length <= 32768;
  const legacy = compatibleRevision
    ? { ...issued, contentRevision: CONTENT_REVISION }
    : issued;
  if (issued.protocolVersion === 37) {
    if (
      issued.contentRevision !==
        "6bf9b3f3f87c98e2e552b99e4dbf6ae856b57b3aba032d03a72bcc97c8367cdd" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 36) {
    if (
      issued.contentRevision !==
        "6f97c9a4f3aabc87e6875b99e18aba60f667335d501ec50e94d215a1f8bc806c" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 35) {
    if (
      issued.contentRevision !==
        "7266df2511e22b94f34915a97c0b4a61e2881778de5cfddff4011a41c2f29fe2" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 34) {
    if (
      issued.contentRevision !==
        "94552a8007ad25febb2f9c8e212ffdf28360bcb1df528a7c7ab226f7388ee675" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 33) {
    if (
      issued.contentRevision !==
        "0d8d0df4d5bd156da29529164a249489dcb3f3dbdda7026921bcc76555eb6266" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 32) {
    if (
      issued.contentRevision !==
        "b6cdeb5a0d7475f65192d16f26a91d31660e9593843704738e1ddf494f5191bb" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 31) {
    if (
      issued.contentRevision !==
        "90c1bd18708bffd5fab92a98490b9f173ba4cdb85956aabda8fef67c4cd6c28d" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 30) {
    if (
      issued.contentRevision !==
        "850f5e0dd38cfd283ff0dbf079892b3595ccc489a95c70586e4fd4a24505402b" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 29) {
    if (
      issued.contentRevision !==
        "e6db0059a1510315047e400e2c135ca2fd3a0368cea21c035946ff6a877631b2" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 28) {
    if (
      issued.contentRevision !==
        "39ca64136ddb477d344eb75408a22ed239af57efb1d3a3a4f5893ac33c13864d" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 27) {
    if (
      issued.contentRevision !==
        "b6d1eca2e4cc89073c4e45a5007b4e39ff98bc30ba98337782777170210a0438" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 26) {
    if (
      issued.contentRevision !==
        "cc48fbf30b18e546d600b05f4c4648330cfd012631c53fd7a4fe57b734b7a97b" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 25) {
    if (
      issued.contentRevision !==
        "a36ec57bba4b76a595d42ac812c69bbda0ab2305ea22cf131b1770e03a57d9d2" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 24) {
    if (
      issued.contentRevision !==
        "27c4b2e298912b53f88b115654857f923966aeccdb80b730e449536a2045ef27" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 23) {
    if (
      issued.contentRevision !==
        "da37e2a0e2beb54343495ce39027211df254fa1c79ab42ec3f3360373ad792db" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 22) {
    if (
      issued.contentRevision !==
        "9598869248912ad6a787d6e72791183acf4e12d38da92f2a677164f93e3f51c7" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 21) {
    if (
      issued.contentRevision !==
        "312aa30276cffb7bb00cf9a303cc3b3461cce80d32e054afd5e91c08f76e2006" ||
      !compatibleRevision
    )
      throw Error("versionMismatch");
    // Protocol 21 already records Standard/Brutal/Crazed completion separately.
    // Full restoration below validates every form and identity without downgrading that history.
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (
    legacy.protocolVersion === 15 ||
    legacy.protocolVersion === 16 ||
    legacy.protocolVersion === 17 ||
    legacy.protocolVersion === 18 ||
    legacy.protocolVersion === 19 ||
    legacy.protocolVersion === 20
  ) {
    if (
      legacy.schemaVersion !== 1 ||
      legacy.contentRevision !== CONTENT_REVISION ||
      legacy.practiceOnly !== true ||
      legacy.serverOnly === true ||
      legacy.players !== undefined ||
      legacy.transactions !== undefined ||
      JSON.stringify(legacy).length > 32768
    )
      throw Error("versionMismatch");
    return {
      ...legacy,
      protocolVersion: PROTOCOL,
      completedBossForms: Object.fromEntries(
        ((legacy.completedBossIds ?? []) as string[]).map((id) => [
          id,
          "normal",
        ]),
      ),
    };
  }
  if (
    ![4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(
      legacy.protocolVersion as number,
    )
  )
    return legacy;
  const version = legacy.protocolVersion as number;
  const previousServiceBosses = [
    "matron",
    "alchemist",
    "bellringer",
    "stitchwright",
    "glass-surgeon",
    "ash-baker",
    "sluice-keeper",
    "stationmaster",
    "lamplighter",
    "anatomist",
    "plague-gardener",
    "choir",
    "red-abbess",
    "vesper-judge",
  ];
  const previousDistrictBosses = [
    "pallbearer",
    "cinder-foreman",
    "canal-diver",
    "clockmender",
    "wire-seamstress",
    "gravedigger",
    "ink-notary",
    "spore-beekeeper",
    "ice-custodian",
    "bridge-ferryman",
    "porcelain-mourner",
    "boiler-tender",
    "mirror-undertaker",
    "chalk-magistrate",
    "wire-harpist",
    "crow-shepherd",
    "ledger-leech",
    "engine",
    "regent",
    "salt-patriarch",
  ];
  const previousRaidBosses = [
    "chain-colossus",
    "ossuary-leviathan",
    "bell-triplets",
    "quarantine-heart",
    "crown-procession",
    "city-eater",
    "last-breath-saint",
  ];
  const bosses =
    version >= 12
      ? catalog.bosses
          .filter(
            (b) =>
              !["ashen-usher", "brass-toad", "ragpicker-kite"].includes(b.id),
          )
          .map((b) => b.id)
      : version >= 7
        ? [
            "constable",
            "lantern-warden",
            "courier",
            "ratcatcher",
            "quarantine-clerk",
            "tollkeeper",
            "chain-marshal",
            "gate-widow",
            "black-ambulance",
            ...(version >= 9 ? previousServiceBosses : []),
            ...(version >= 10 ? previousDistrictBosses : []),
            ...(version >= 11 ? previousRaidBosses : []),
          ]
        : version === 4
          ? ["constable"]
          : version === 5
            ? ["constable", "lantern-warden"]
            : [
                "constable",
                "lantern-warden",
                "courier",
                "ratcatcher",
                "quarantine-clerk",
              ];
  const oldSettings = legacy.settings as Record<string, unknown> | undefined;
  if (
    !oldSettings ||
    typeof oldSettings !== "object" ||
    !(
      version >= 11
        ? ["short", "standard", "long", "raid", "endless"]
        : version === 10
          ? ["short", "standard", "long", "endless"]
          : version === 9
            ? ["short", "standard", "endless"]
            : ["short", "endless"]
    ).includes(oldSettings.mode as string) ||
    (oldSettings.openingBossId !== undefined &&
      !bosses.includes(oldSettings.openingBossId as string)) ||
    (version < 7 &&
      oldSettings.openingArenaId !== undefined &&
      oldSettings.openingArenaId !== "gatehouse")
  )
    throw Error("versionMismatch");
  if (
    legacy.schemaVersion !== 1 ||
    legacy.contentRevision !== CONTENT_REVISION ||
    legacy.practiceOnly !== true ||
    legacy.serverOnly === true ||
    legacy.players !== undefined ||
    legacy.transactions !== undefined ||
    !legacy.player ||
    typeof legacy.player !== "object" ||
    !(
      version >= 8
        ? ["soldier", "medic", "heavy", "tank", "mage", "engineer", "assassin"]
        : version === 4
          ? ["soldier", "medic"]
          : ["soldier", "medic", "heavy"]
    ).includes((legacy.player as Record<string, unknown>).classId as string) ||
    JSON.stringify(value).length > 32768
  )
    throw Error("versionMismatch");
  if (
    version !== 4 &&
    (!Array.isArray(legacy.completedBossIds) ||
      !legacy.completedBossIds.every((id) => bosses.includes(String(id))))
  )
    throw Error("invalidBossHistory");
  const contract = (candidate: unknown) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      throw Error("invalidCards");
    const card = candidate as Record<string, unknown>;
    if (
      card.variant !== undefined &&
      !["normal", "brutal"].includes(String(card.variant))
    )
      throw Error("invalidCards");
    if (version === 14) {
      if (!bosses.includes(card.bossId as string)) throw Error("invalidCards");
      return card; // Issued fixed-grade cards are validated unchanged by the full restore.
    }
    if (
      !Number.isSafeInteger(card.risk) ||
      Number(card.risk) < 0 ||
      Number(card.risk) > 2 ||
      !Number.isSafeInteger(card.threat) ||
      Number(card.threat) < 1 ||
      Number(card.threat) > 11 ||
      typeof card.bounty !== "number" ||
      !Number.isFinite(card.bounty) ||
      card.bounty < 1 ||
      card.bounty > 3
    )
      throw Error("invalidCards");
    if (version !== 4) {
      if (!bosses.includes(card.bossId as string)) throw Error("invalidCards");
      return {
        ...card,
        ...classifiedContract(
          card.bossId as BossId,
          card.variant === "brutal" ? "brutal" : "normal",
        ),
      };
    }
    if (card.bossId !== undefined && card.bossId !== "constable")
      throw Error("invalidCards");
    return {
      ...card,
      ...classifiedContract(
        "constable",
        card.variant === "brutal" ? "brutal" : "normal",
      ),
    };
  };
  if (!Array.isArray(legacy.contractCards) || legacy.contractCards.length > 3)
    throw Error("invalidCards");
  return {
    ...legacy,
    protocolVersion: PROTOCOL,
    completedBossForms: Object.fromEntries(
      ((legacy.completedBossIds ?? []) as string[]).map((id) => [id, "normal"]),
    ),
    settings: {
      ...oldSettings,
      runId:
        version >= 13
          ? oldSettings.runId
          : "legacy-" + oldSettings.seed + "-" + oldSettings.mode,
    },
    player: {
      ...(legacy.player as object),
      progress:
        version >= 13
          ? (legacy.player as Record<string, unknown>).progress
          : {
              clears: legacy.encounter,
              rescues: 0,
              campaignClears: legacy.campaignBank
                ? (legacy.campaignBank as { encounters: number }).encounters
                : 0,
              firstEncounter: Number(legacy.encounter) > 0 ? 0 : -1,
              clearedBossIds:
                version === 4
                  ? Number(legacy.encounter) > 0
                    ? ["constable"]
                    : []
                  : legacy.completedBossIds,
            },
    },
    ...(version >= 12
      ? {
          timeouts: legacy.timeouts,
          secretStatus: legacy.secretStatus,
          campaignBank: legacy.campaignBank,
          extensionParticipants: legacy.extensionParticipants,
          endlessHistory: legacy.endlessHistory,
        }
      : {
          timeouts: 0,
          secretStatus: "locked",
          campaignBank: null,
          extensionParticipants: [],
          endlessHistory: {
            recent:
              oldSettings.mode === "endless" &&
              Array.isArray(legacy.completedBossIds)
                ? legacy.completedBossIds.slice(-12)
                : [],
            routeBag: [],
            exclusiveBag: [],
          },
        }),
    completedBossIds:
      version !== 4
        ? legacy.completedBossIds
        : typeof legacy.encounter === "number" && legacy.encounter > 0
          ? ["constable"]
          : [],
    selectedContract: contract(legacy.selectedContract),
    contractCards: legacy.contractCards.map(contract),
  };
}

/** Only already-recognized issued local saves receive the Story flow conversion. */
export function migratePracticeBoundary(value: unknown): unknown {
  let migrated = migrateKnownPracticeBoundary(value);
  // A changed object proves recognition by an exact issued local migration.
  // Earlier47 chapter/content paths retain data but now enter the48 wire era.
  if(migrated!==value&&migrated&&typeof migrated==='object'&&!Array.isArray(migrated)&&(migrated as Record<string,unknown>).protocolVersion===47)migrated={...(migrated as Record<string,unknown>),protocolVersion:PROTOCOL};
  if (
    migrated === value ||
    !migrated ||
    typeof migrated !== "object" ||
    Array.isArray(migrated)
  )
    return migrated;
  const issued = migrated as Record<string, unknown>;
  if (
    !issued.settings ||
    typeof issued.settings !== "object" ||
    (issued.settings as Record<string, unknown>).mode !== "story"
  )
    return migrated;
  return {
    ...issued,
    mutations: [],
    mutationCards: [],
    ...(issued.phase === "mutationVote"
      ? { phase: "storyScene", phaseEnds: 0, votes: {} }
      : {}),
  };
}
