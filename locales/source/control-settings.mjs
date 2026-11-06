// AI-authored; native-language and rendered acceptance remain separate.
const keys=['controlsSaved','controlsUnchanged','controlMouseLeft','controlMouseMiddle','controlMouseRight','controlSpace','controlLeftStick'];
const rows={
 en:['Controls saved.','Controls unchanged.','Left mouse button','Middle mouse button','Right mouse button','Space','Left stick'],
 'zh-Hans':['操作设置已保存。','操作设置未更改。','鼠标左键','鼠标中键','鼠标右键','空格键','左摇杆'],
 'zh-Hant':['操作設定已儲存。','操作設定未變更。','滑鼠左鍵','滑鼠中鍵','滑鼠右鍵','空白鍵','左搖桿'],
 ja:['操作設定を保存しました。','操作設定は変更されていません。','マウス左ボタン','マウス中央ボタン','マウス右ボタン','スペースキー','左スティック'],
 es:['Controles guardados.','Controles sin cambios.','Botón izquierdo del ratón','Botón central del ratón','Botón derecho del ratón','Espacio','Palanca izquierda'],
 fr:['Commandes enregistrées.','Commandes inchangées.','Bouton gauche de la souris','Bouton central de la souris','Bouton droit de la souris','Espace','Stick gauche'],
 de:['Steuerung gespeichert.','Steuerung unverändert.','Linke Maustaste','Mittlere Maustaste','Rechte Maustaste','Leertaste','Linker Stick'],
 'pt-BR':['Controles salvos.','Controles sem alterações.','Botão esquerdo do mouse','Botão do meio do mouse','Botão direito do mouse','Espaço','Analógico esquerdo'],
 ru:['Управление сохранено.','Управление не изменено.','Левая кнопка мыши','Средняя кнопка мыши','Правая кнопка мыши','Пробел','Левый стик'],
 ar:['تم حفظ أزرار التحكم.','لم تتغير أزرار التحكم.','زر الفأرة الأيسر','زر الفأرة الأوسط','زر الفأرة الأيمن','مفتاح المسافة','عصا التحكم اليسرى'],
 hi:['कंट्रोल सहेजे गए।','कंट्रोल में बदलाव नहीं हुआ।','माउस का बायाँ बटन','माउस का बीच वाला बटन','माउस का दायाँ बटन','स्पेस','बाईं स्टिक'],
 bn:['নিয়ন্ত্রণ সংরক্ষিত হয়েছে।','নিয়ন্ত্রণ বদলায়নি।','মাউসের বাঁ বোতাম','মাউসের মাঝের বোতাম','মাউসের ডান বোতাম','স্পেস','বাঁ স্টিক'],
 id:['Kontrol disimpan.','Kontrol tidak berubah.','Tombol kiri mouse','Tombol tengah mouse','Tombol kanan mouse','Spasi','Stik kiri'],
 ur:['کنٹرول محفوظ ہو گئے۔','کنٹرول تبدیل نہیں ہوئے۔','ماؤس کا بایاں بٹن','ماؤس کا درمیانی بٹن','ماؤس کا دایاں بٹن','اسپیس','بائیں اسٹک'],
 ko:['조작 설정을 저장했습니다.','조작 설정이 변경되지 않았습니다.','마우스 왼쪽 버튼','마우스 가운데 버튼','마우스 오른쪽 버튼','스페이스','왼쪽 스틱'],
};
export function controlSettingsMessages(locale){const row=rows[locale];if(!row||row.length!==keys.length)throw Error('Missing control-settings locale: '+locale);return Object.fromEntries(keys.map((key,i)=>['ui.'+key,row[i].normalize('NFC')]));}
