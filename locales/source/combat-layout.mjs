// AI-authored labels; native-speaker review remains separate.
const rows={
 en:['Equipment and abilities','Together','Separate panels'],
 'zh-Hans':['装备和技能','合并显示','分开显示'],
 'zh-Hant':['裝備與技能','合併顯示','分開顯示'],
 ja:['装備とアビリティ','まとめて表示','別々に表示'],
 es:['Equipo y habilidades','Juntos','Paneles separados'],
 fr:['Équipement et capacités','Ensemble','Panneaux séparés'],
 de:['Ausrüstung und Fähigkeiten','Zusammen','Getrennte Bereiche'],
 'pt-BR':['Equipamento e habilidades','Juntos','Painéis separados'],
 ru:['Снаряжение и способности','Вместе','Отдельные панели'],
 hi:['उपकरण और क्षमताएँ','एक साथ','अलग पैनल'],
 ar:['المعدات والقدرات','معًا','لوحتان منفصلتان'],
 bn:['সরঞ্জাম ও ক্ষমতা','একসঙ্গে','আলাদা প্যানেল'],
 id:['Perlengkapan dan kemampuan','Bersama','Panel terpisah'],
 ur:['سامان اور صلاحیتیں','ایک ساتھ','الگ پینل'],
 ko:['장비 및 능력','함께 표시','패널 분리'],
};
export function combatLayoutMessages(locale){const row=rows[locale];if(!row)throw Error('Missing combat layout locale '+locale);return Object.fromEntries(['equipmentAbilityPanels','panelsTogether','panelsSeparate'].map((k,i)=>['ui.'+k,row[i].normalize('NFC')]));}
