const rows={
 en:['Expanded skill map','All {count} skills. Scroll to explore; arrow keys move between skills.','Zoom in','Zoom out','Reset zoom'],
 'zh-Hans':['展开技能全图','全部 {count} 个技能。滚动浏览；方向键切换技能。','放大','缩小','重置缩放'],
 'zh-Hant':['展開技能全圖','全部 {count} 個技能。捲動瀏覽；方向鍵切換技能。','放大','縮小','重設縮放'],
 ja:['スキル全体図','全{count}スキル。スクロールで探索し、矢印キーで移動できます。','拡大','縮小','倍率を戻す'],
 es:['Mapa de habilidades ampliado','Las {count} habilidades. Desplázate para explorar; usa las flechas para moverte.','Ampliar','Reducir','Restablecer escala'],
 fr:['Carte complète des compétences','Les {count} compétences. Faites défiler pour explorer ; utilisez les flèches pour naviguer.','Agrandir','Réduire','Rétablir le zoom'],
 de:['Erweiterte Fertigkeitskarte','Alle {count} Fertigkeiten. Zum Erkunden scrollen; mit Pfeiltasten wechseln.','Vergrößern','Verkleinern','Ansicht zurücksetzen'],
 'pt-BR':['Mapa ampliado de habilidades','Todas as {count} habilidades. Role para explorar; use as setas para navegar.','Ampliar','Reduzir','Restaurar escala'],
 ru:['Полная карта навыков','Все {count} навыков. Прокручивайте для обзора; переходите стрелками.','Увеличить','Уменьшить','Сбросить масштаб'],
 hi:['विस्तृत कौशल मानचित्र','सभी {count} कौशल। देखने के लिए स्क्रॉल करें; कौशल बदलने के लिए तीर कुंजियाँ दबाएँ।','बड़ा करें','छोटा करें','ज़ूम रीसेट करें'],
 ar:['خريطة المهارات الموسعة','كل المهارات وعددها {count}. مرّر للاستكشاف واستخدم الأسهم للتنقل.','تكبير','تصغير','إعادة ضبط التكبير'],
 bn:['বিস্তৃত দক্ষতার মানচিত্র','সব {count}টি দক্ষতা। দেখতে স্ক্রল করুন; তীরচিহ্নের বোতামে দক্ষতা বদলান।','বড় করুন','ছোট করুন','জুম ফিরিয়ে আনুন'],
 id:['Peta keterampilan lengkap','Semua {count} keterampilan. Gulir untuk menjelajah; tombol panah berpindah keterampilan.','Perbesar','Perkecil','Atur ulang skala'],
 ur:['وسیع مہارت کا نقشہ','تمام {count} مہارتیں۔ دیکھنے کے لیے سکرول کریں؛ مہارت بدلنے کے لیے تیر والی کنجیاں دبائیں۔','بڑا کریں','چھوٹا کریں','زوم بحال کریں'],
 ko:['전체 스킬 지도','스킬 {count}개 전체입니다. 스크롤로 살펴보고 방향키로 이동하세요.','확대','축소','배율 초기화']
};
export function skillMapMessages(locale){const row=rows[locale];if(!row)throw Error('Missing skill-map locale '+locale);return Object.fromEntries(['branchingTree','skillMapHelp','zoomIn','zoomOut','resetZoom'].map((key,i)=>['ui.'+key,row[i]]));}
