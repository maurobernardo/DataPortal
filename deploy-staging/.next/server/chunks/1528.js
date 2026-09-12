"use strict";exports.id=1528,exports.ids=[1528],exports.modules={31528:(e,a,t)=>{t.d(a,{$w:()=>P,Gy:()=>D,LC:()=>l,LS:()=>h,PO:()=>$,Pi:()=>j,Sg:()=>T,W5:()=>i,iX:()=>b,kq:()=>R,l0:()=>y,l3:()=>z,lL:()=>v,lY:()=>E,rJ:()=>x,xH:()=>M,xe:()=>w});var o=t(55245);function r(e){let a=process.env[e]?.trim();if(!a)throw Error(`Variavel de ambiente ausente: ${e}`);return a}function i(){return!!(process.env.SMTP_HOST?.trim()&&process.env.SMTP_PORT?.trim()&&process.env.SMTP_USER?.trim()&&process.env.SMTP_PASS?.trim())}function n(){let e=r("SMTP_HOST"),a=Number(r("SMTP_PORT")),t=r("SMTP_USER"),i=r("SMTP_PASS"),n="true"===process.env.SMTP_SECURE;return o.createTransport({host:e,port:a,secure:n,auth:{user:t,pass:i}})}function s(){return(process.env.NEXTAUTH_URL||"http://localhost:3000").replace(/\/$/,"")}function l(){return!!(process.env.SMTP_HOST&&process.env.SMTP_PORT&&process.env.SMTP_USER&&process.env.SMTP_PASS&&process.env.CONTACT_RECIPIENT_EMAIL)}let d="Inter,Arial,sans-serif";function p(e){return`<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${e.heading}</title>
</head>
<body style="margin:0; padding:0; background-color:#F1F8F4; font-family:${d};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F8F4; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #E2E8E5;">
          <tr>
            <td style="background-color:#064E2C; padding:28px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="44" style="width:44px; background-color:#ffffff; border-radius:10px; padding:4px;" valign="middle">
                    <img src="${s()}/images/logo.png" width="36" height="36" alt="Data Portal" style="display:block; width:36px; height:36px; border-radius:8px;" />
                  </td>
                  <td style="width:12px;">&nbsp;</td>
                  <td valign="middle">
                    <p style="margin:0; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#9FD4B4; font-family:${d};">
                      Data Portal \xb7 Data4Moz
                    </p>
                    <p style="margin:6px 0 0 0; font-size:20px; font-weight:800; line-height:1.3; color:#ffffff; font-family:${d};">
                      ${e.heading}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px;">
              ${e.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px; background-color:#FAFBFA; border-top:1px solid #E2E8E5;">
              ${e.footerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`}function c(e){return`<p style="margin:0 0 20px 0; font-size:14px; line-height:1.7; color:#1F2A24; font-family:${d};">${e}</p>`}function m(e){return`<p style="margin:0 0 20px 0; font-size:32px; font-weight:700; letter-spacing:6px; color:#064E2C; font-family:${d};">${e}</p>`}function u(e,a){return`
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 4px 0;">
      <tr>
        <td style="border-radius:10px; background-color:#064E2C;">
          <a href="${a}" style="display:inline-block; padding:13px 28px; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; font-family:${d};">
            ${e}
          </a>
        </td>
      </tr>
    </table>`}function g(e){return`<p style="margin:0; font-size:12px; line-height:1.6; color:#8B9A91; font-family:${d};">${e}</p>`}function f(e){return g(`Recebeu este email porque tem uma conta no Data Portal associada a ${e}. D\xfavidas? Responda a este email ou contacte portaldedados@data4moz.com.`)}async function x(e){let a=r("SMTP_USER"),t=r("CONTACT_RECIPIENT_EMAIL"),o=n(),i=[c(`<strong>Nome:</strong> ${e.fromName}`),c(`<strong>Email:</strong> ${e.fromEmail}`),e.purposeLabel?c(`<strong>Finalidade:</strong> ${e.purposeLabel}`):"",c(`<strong>Assunto:</strong> ${e.subject}`),`<div style="margin:20px 0 0 0; padding:16px; background-color:#F7F9F8; border:1px solid #E2E8E5; border-radius:10px;">
      <p style="margin:0; font-size:13px; line-height:1.7; color:#1F2A24; font-family:${d}; white-space:pre-wrap;">${e.message}</p>
    </div>`].join("");await o.sendMail({from:`"Data Portal - Contacto" <${a}>`,to:t,replyTo:`${e.fromName} <${e.fromEmail}>`,subject:`[Contacto Portal] ${e.subject}`,text:[`Nome: ${e.fromName}`,`Email: ${e.fromEmail}`,e.purposeLabel?`Finalidade: ${e.purposeLabel}`:null,`Assunto: ${e.subject}`,"","Mensagem:",e.message].filter(e=>null!==e).join("\n"),html:p({heading:"Nova mensagem de contacto",bodyHtml:i,footerHtml:g("Enviado a partir do formul\xe1rio de contacto do Data Portal.")})})}async function $(e){let a=r("SMTP_USER"),t=r("CONTACT_RECIPIENT_EMAIL"),o=n(),i=[c("Novo feedback recebido durante a fase beta do Data Portal."),c(`<strong>Nome:</strong> ${e.fromName}`),c(`<strong>Email:</strong> ${e.fromEmail}`),`<div style="margin:20px 0 0 0; padding:16px; background-color:#F7F9F8; border:1px solid #E2E8E5; border-radius:10px;">
      <p style="margin:0; font-size:13px; line-height:1.7; color:#1F2A24; font-family:${d}; white-space:pre-wrap;">${e.message}</p>
    </div>`].join("");await o.sendMail({from:`"Data Portal - Feedback Beta" <${a}>`,to:t,replyTo:`${e.fromName} <${e.fromEmail}>`,subject:`[Feedback Beta] ${e.fromName}`,text:["Novo feedback recebido durante a fase beta do Data Portal.","",`Nome: ${e.fromName}`,`Email: ${e.fromEmail}`,"","Mensagem:",e.message].join("\n"),html:p({heading:"Novo feedback da fase beta",bodyHtml:i,footerHtml:g("Enviado a partir do bot\xe3o de feedback do Data Portal.")})})}async function b(e,a,t){let o=r("SMTP_USER"),i=n(),l=`${s()}/verificar-email?token=${encodeURIComponent(t)}`,d=[c("Obrigado por se registar no <strong>Data Portal</strong>."),c("Utilize o c\xf3digo abaixo para activar a sua conta (v\xe1lido por <strong>30 minutos</strong>):"),m(a),u("Confirmar pelo link",l)].join("");await i.sendMail({from:`"Data Portal" <${o}>`,to:e,subject:"Data Portal: confirme o seu registo",text:`Obrigado por se registar no Data Portal.

C\xf3digo de confirma\xe7\xe3o: ${a}

Introduza este c\xf3digo na p\xe1gina de verifica\xe7\xe3o (v\xe1lido por 30 minutos).

Ou confirme pelo link: ${l}

Se n\xe3o criou esta conta, ignore este email.`,html:p({heading:"Confirme o seu registo",bodyHtml:d,footerHtml:g("Se n\xe3o criou esta conta, ignore este email.")})})}async function h(e,a){let t=r("SMTP_USER"),o=n(),i=[c("Recebemos um pedido para redefinir a sua senha no <strong>Data Portal</strong>."),c("Utilize o c\xf3digo abaixo para continuar (v\xe1lido por <strong>15 minutos</strong>):"),m(a)].join("");await o.sendMail({from:`"Data Portal" <${t}>`,to:e,subject:"Data Portal: recupera\xe7\xe3o de senha",text:`Recebemos um pedido para redefinir a sua senha no Data Portal.

C\xf3digo de recupera\xe7\xe3o: ${a}

Introduza este c\xf3digo na p\xe1gina de redefini\xe7\xe3o de senha (v\xe1lido por 15 minutos).

Se n\xe3o solicitou esta altera\xe7\xe3o, ignore este email: a sua senha actual permanece v\xe1lida.`,html:p({heading:"Recupera\xe7\xe3o de senha",bodyHtml:i,footerHtml:g("Se n\xe3o solicitou esta altera\xe7\xe3o, ignore este email; a sua senha actual permanece v\xe1lida.")})})}async function P(e,a){let t=r("SMTP_USER"),o=n(),i=[c("Recebemos um pedido para associar este email \xe0 sua conta no <strong>Data Portal</strong>."),c("Utilize o c\xf3digo abaixo para confirmar (v\xe1lido por <strong>15 minutos</strong>):"),m(a)].join("");await o.sendMail({from:`"Data Portal" <${t}>`,to:e,subject:"Data Portal: confirme o seu novo email",text:`Recebemos um pedido para associar este email \xe0 sua conta no Data Portal.

C\xf3digo de confirma\xe7\xe3o: ${a}

Introduza este c\xf3digo na p\xe1gina de perfil para concluir a altera\xe7\xe3o (v\xe1lido por 15 minutos).

Se n\xe3o solicitou esta altera\xe7\xe3o, ignore este email: o seu email actual permanece v\xe1lido.`,html:p({heading:"Confirme o seu novo email",bodyHtml:i,footerHtml:g("Se n\xe3o solicitou esta altera\xe7\xe3o, ignore este email; o seu email actual permanece v\xe1lido.")})})}async function v(e,a,t){let o=r("SMTP_USER"),i=n(),l=`${s()}/dataset/${t}`,d=[c(`O dataset <strong>${a}</strong> que subscreveu foi actualizado no Data Portal.`),u("Ver dataset actualizado",l)].join("");await i.sendMail({from:`"Data Portal" <${o}>`,to:e,subject:`Data Portal: "${a}" foi actualizado`,text:`O dataset "${a}" que subscreveu foi actualizado no Data Portal.

Ver o dataset: ${l}

Recebe este email porque activou alertas de actualiza\xe7\xe3o para este dataset a partir de uma an\xe1lise de IA Insights guardada.`,html:p({heading:"Dataset actualizado",bodyHtml:d,footerHtml:g("Recebe este email porque activou alertas de actualiza\xe7\xe3o para este dataset a partir de uma an\xe1lise de IA Insights guardada.")})})}async function E(e,a,t,o){let i=r("SMTP_USER"),l=n(),d=`${s()}/analise/nova?datasets=${encodeURIComponent(o)}&pergunta=${encodeURIComponent(t)}`,m=[c(`O dataset <strong>${a}</strong> foi actualizado com dados mais recentes.`),c(`J\xe1 fez uma an\xe1lise de IA sobre este tema ("${t}"). Pode valer a pena repetir a mesma pergunta para ver se a resposta mudou.`),u("Repetir a an\xe1lise com os dados novos",d)].join("");await l.sendMail({from:`"Data Portal" <${i}>`,to:e,subject:`Data Portal: novos dados para uma an\xe1lise que j\xe1 fez`,text:`O dataset "${a}" foi actualizado com dados mais recentes.
J\xe1 fez uma an\xe1lise sobre este tema ("${t}"). Pode valer a pena repetir a pergunta.

Repetir a an\xe1lise: ${d}`,html:p({heading:"Novos dados para uma an\xe1lise que j\xe1 fez",bodyHtml:m,footerHtml:g("Recebe este email porque j\xe1 fez uma an\xe1lise de IA Insights usando este dataset, e ele foi actualizado desde ent\xe3o.")})})}async function y(e,a,t,o){let i=r("SMTP_USER"),l=n(),d=`${s()}/dataset/${t}`,m=o.map(e=>`${e.coluna}: ${e.totalAnterior.toLocaleString("pt-BR")} → ${e.totalNovo.toLocaleString("pt-BR")} (${e.variacaoPercentual>=0?"+":""}${(100*e.variacaoPercentual).toFixed(0)}%)`),f=`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0; border-collapse:collapse;">
      <tr>
        <td style="padding:8px 10px; font-size:12px; font-weight:700; color:#4A5A52; border-bottom:1px solid #E2E8E5;">Coluna</td>
        <td style="padding:8px 10px; font-size:12px; font-weight:700; color:#4A5A52; border-bottom:1px solid #E2E8E5;">Antes</td>
        <td style="padding:8px 10px; font-size:12px; font-weight:700; color:#4A5A52; border-bottom:1px solid #E2E8E5;">Depois</td>
        <td style="padding:8px 10px; font-size:12px; font-weight:700; color:#4A5A52; border-bottom:1px solid #E2E8E5;">Varia\xe7\xe3o</td>
      </tr>
      ${o.map(e=>`
        <tr>
          <td style="padding:8px 10px; font-size:13px; color:#1F2A24; border-bottom:1px solid #F1F8F4;">${e.coluna}</td>
          <td style="padding:8px 10px; font-size:13px; color:#1F2A24; border-bottom:1px solid #F1F8F4;">${e.totalAnterior.toLocaleString("pt-BR")}</td>
          <td style="padding:8px 10px; font-size:13px; color:#1F2A24; border-bottom:1px solid #F1F8F4;">${e.totalNovo.toLocaleString("pt-BR")}</td>
          <td style="padding:8px 10px; font-size:13px; font-weight:700; color:${e.variacaoPercentual>=0?"#0A6B3D":"#9F1616"}; border-bottom:1px solid #F1F8F4;">${e.variacaoPercentual>=0?"+":""}${(100*e.variacaoPercentual).toFixed(0)}%</td>
        </tr>`).join("")}
    </table>`,x=[c(`O dataset <strong>${a}</strong> foi actualizado e alguns valores mudaram de forma acentuada face \xe0 vers\xe3o anterior:`),f,c("Se esta varia\xe7\xe3o for esperada (ex.: correc\xe7\xe3o de um erro anterior, novo per\xedodo de refer\xeancia), pode ignorar este alerta."),u("Ver dataset",d)].join("");await l.sendMail({from:`"Data Portal" <${i}>`,to:e,subject:`Data Portal: varia\xe7\xe3o acentuada em "${a}"`,text:[`O dataset "${a}" foi actualizado e alguns valores mudaram de forma acentuada:`,"",...m,"",`Ver dataset: ${d}`].join("\n"),html:p({heading:"Varia\xe7\xe3o acentuada entre vers\xf5es",bodyHtml:x,footerHtml:g("Recebe este alerta por ser administrador do Data Portal.")})})}let S={dataset:"dataset",relatorio:"relat\xf3rio",dashboard:"dashboard"};async function D(e,a){let t=r("SMTP_USER"),o=n(),i=s(),l=a.map((e,a)=>`
        <tr>
          <td style="padding:${0===a?"0":"14px"} 0 0 0; border-top:${0===a?"none":"1px solid #E2E8E5"}; padding-top:${0===a?"0":"14px"};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="4" style="background-color:#064E2C; border-radius:2px;">&nbsp;</td>
                <td style="width:12px;">&nbsp;</td>
                <td>
                  <p style="margin:0 0 2px 0; font-size:11px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; color:#8B9A91; font-family:${d};">
                    ${S[e.tipo]}
                  </p>
                  <a href="${i}${e.url}" style="font-size:14px; font-weight:700; color:#064E2C; text-decoration:none; font-family:${d};">
                    ${e.titulo}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`).join(""),m=[c(`Esta semana, o Data Portal publicou <strong>${a.length}</strong> conte\xfado${1===a.length?"":"s"} novo${1===a.length?"":"s"}:`),`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${l}</table>`,`<div style="margin-top:24px;">${u("Ver tudo no portal",i)}</div>`].join("");await o.sendMail({from:`"Data Portal" <${t}>`,to:e,subject:`Data Portal: ${a.length} novidade${1===a.length?"":"s"} esta semana`,text:[`Esta semana, o Data Portal publicou ${a.length} conte\xfado(s) novo(s):`,"",...a.map(e=>`- [${S[e.tipo]}] ${e.titulo}: ${i}${e.url}`),"",`Ver tudo: ${i}`,"","Recebe este email porque tem uma conta registada no Data Portal e escolheu receber notifica\xe7\xf5es."].join("\n"),html:p({heading:"Novidades desta semana",bodyHtml:m,footerHtml:f(e)})})}async function w(e,a){let t=r("SMTP_USER"),o=n(),i=`${s()}/dashboard`,l=[c(`<strong>Nome:</strong> ${a.name}`),c(`<strong>Email:</strong> ${a.email}`),u("Ver utilizadores",i)].join("");await o.sendMail({from:`"Data Portal" <${t}>`,to:e,subject:`Data Portal: novo utilizador registado: ${a.name}`,text:`Um novo utilizador registou-se no Data Portal.

Nome: ${a.name}
Email: ${a.email}

Ver utilizadores: ${i}`,html:p({heading:"Novo utilizador registado",bodyHtml:l,footerHtml:g("Recebe este alerta por ser administrador do Data Portal.")})})}async function z(e,a,t,o){let i=r("SMTP_USER"),l=n(),m="views"===a?"visualiza\xe7\xf5es":"downloads",f=`${s()}/dashboard`,x=new Date().toLocaleDateString("pt-PT"),$=[c(`O Data Portal atingiu <strong>${t} ${m}</strong> hoje (${x}).`),`<p style="margin:0 0 20px 0; font-size:32px; font-weight:700; color:#064E2C; font-family:${d};">${o}</p>`,u("Ver painel de administra\xe7\xe3o",f)].join("");await l.sendMail({from:`"Data Portal" <${i}>`,to:e,subject:`Data Portal: ${t}+ ${m} hoje`,text:`O portal atingiu ${t} ${m} hoje (${x}).

Total actual: ${o} ${m}.

Ver painel: ${f}`,html:p({heading:`${t}+ ${m} hoje`,bodyHtml:$,footerHtml:g("Recebe este alerta por ser administrador do Data Portal.")})})}async function j(e,a){let t=r("SMTP_USER"),o=n(),i=s(),l=a.trim().split(/\s+/)[0]||a,m=[{title:"Cat\xe1logo de dados",desc:"Datasets geoespaciais e alfanum\xe9ricos oficiais, com pr\xe9-visualiza\xe7\xe3o antes de descarregar."},{title:"An\xe1lise por Intelig\xeancia Artificial",desc:"Fa\xe7a uma pergunta em portugu\xeas sobre dados geoespaciais, alfanum\xe9ricos ou os dois cruzados, e receba um dashboard com gr\xe1ficos, mapas interactivos e KPIs."},{title:"Relat\xf3rios",desc:"Pe\xe7a um resumo autom\xe1tico de qualquer relat\xf3rio j\xe1 publicado no portal, ou carregue o seu pr\xf3prio PDF para a IA analisar."},{title:"Mapas Inteligentes e Dashboards",desc:"Visualiza\xe7\xf5es interactivas j\xe1 preparadas, prontas a explorar sem instalar nada."},{title:"Levantamento 360\xb0",desc:"Navegue pelas ruas de Maputo e Chimoio captadas em 360\xb0, sem sair do portal."},{title:"Favoritos e alertas",desc:"Guarde os datasets que usa com frequ\xeancia e seja avisado quando forem actualizados."}],g=m.map((e,a)=>`
        <tr>
          <td style="padding:${0===a?"0":"20px"} 0 0 0; border-top:${0===a?"none":"1px solid #E2E8E5"}; padding-top:${0===a?"0":"20px"};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="4" style="background-color:#064E2C; border-radius:2px;">&nbsp;</td>
                <td style="width:12px;">&nbsp;</td>
                <td>
                  <p style="margin:0 0 4px 0; font-size:15px; font-weight:700; color:#0B1B14; font-family:${d};">
                    ${e.title}
                  </p>
                  <p style="margin:0; font-size:13px; line-height:1.6; color:#4A5A52; font-family:${d};">
                    ${e.desc}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`).join(""),x=[c("A sua conta est\xe1 activa. O Data Portal re\xfane os dados oficiais de Mo\xe7ambique num s\xf3 lugar; eis o que pode fazer a partir de agora:"),`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${g}</table>`,`<div style="margin-top:24px;">${u("Explorar o Data Portal",i)}</div>`].join("");await o.sendMail({from:`"Data Portal" <${t}>`,to:e,subject:"Bem-vindo(a) ao Data Portal",text:[`Bem-vindo(a) ao Data Portal, ${l}.`,"","A sua conta est\xe1 activa. Eis o que pode fazer:",...m.map(e=>`- ${e.title}: ${e.desc}`),"",`Explorar: ${i}`].join("\n"),html:p({heading:`Bem-vindo(a), ${l}.`,bodyHtml:x,footerHtml:f(e)})})}async function R(e,a,t,o){let i=r("SMTP_USER"),l=n(),d=`${s()}/dashboard`,m=[c(`Segue em anexo o relat\xf3rio agendado <strong>${a}</strong>, com os dados ${t}.`),u("Abrir painel de administra\xe7\xe3o",d)].join("");await l.sendMail({from:`"Data Portal" <${i}>`,to:e,subject:`Data Portal: relat\xf3rio agendado "${a}"`,text:`Segue em anexo o relat\xf3rio agendado "${a}", com os dados ${t}.

Ver painel: ${d}`,html:p({heading:"Relat\xf3rio agendado",bodyHtml:m,footerHtml:g("Recebe este relat\xf3rio porque foi adicionado como destinat\xe1rio de uma exporta\xe7\xe3o agendada no Data Portal.")}),attachments:[{filename:`data-portal-relatorio-${a.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.pdf`,content:o,contentType:"application/pdf"}]})}async function M(e,a,t){let o=r("SMTP_USER"),i=n(),s=[c(`O backup <strong>${a}</strong> da base de dados falhou hoje.`),`<div style="margin:20px 0 0 0; padding:16px; background-color:#FBEAEA; border:1px solid #E8B4B4; border-radius:10px;">
      <p style="margin:0; font-size:13px; line-height:1.7; color:#7A1F1F; font-family:${d}; white-space:pre-wrap;">${t}</p>
    </div>`,c("Verifique o espa\xe7o em disco e a liga\xe7\xe3o \xe0 base de dados no servidor.")].join("");await i.sendMail({from:`"Data Portal - Seguran\xe7a" <${o}>`,to:e,subject:`Data Portal: backup "${a}" falhou`,text:[`O backup ${a} da base de dados falhou hoje.`,"",t].join("\n"),html:p({heading:"Falha no backup da base de dados",bodyHtml:s,footerHtml:g("Recebe este alerta por ser administrador do Data Portal.")})})}async function T(e,a){let t=r("SMTP_USER"),o=n(),i=[c("Utilize o c\xf3digo abaixo para concluir o login no <strong>Data Portal</strong>:"),m(a),c("Este c\xf3digo expira em <strong>5 minutos</strong>.")].join("");await o.sendMail({from:`"Data Portal" <${t}>`,to:e,subject:"Data Portal: c\xf3digo de verifica\xe7\xe3o",text:["Utilize o c\xf3digo abaixo para concluir o login no Data Portal:","",a,"","Este c\xf3digo expira em 5 minutos.","Se n\xe3o solicitou este c\xf3digo, ignore este email."].join("\n"),html:p({heading:"C\xf3digo de verifica\xe7\xe3o",bodyHtml:i,footerHtml:g("Se n\xe3o solicitou este c\xf3digo, ignore este email.")})})}}};