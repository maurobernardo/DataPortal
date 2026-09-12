"use strict";exports.id=9548,exports.ids=[9548],exports.modules={39548:(e,t,a)=>{a.d(t,{LM:()=>eP,JQ:()=>te,oz:()=>v,SC:()=>W,At:()=>L,zx:()=>q,XQ:()=>H,Tg:()=>k,DR:()=>K,bz:()=>j,hL:()=>eH,eD:()=>eF,yt:()=>_,$V:()=>tR,Od:()=>tH,mB:()=>tM,q9:()=>M,k4:()=>es,bg:()=>tm,Ty:()=>eL,L5:()=>t1,LT:()=>to,wM:()=>ee,Zn:()=>e4,MB:()=>e5,T3:()=>eJ,Ry:()=>ej,db:()=>l,yT:()=>ey,Cz:()=>tP,cG:()=>th,i5:()=>b,uu:()=>eE,Io:()=>ep,n:()=>tN,GR:()=>e8,F5:()=>G,hf:()=>eS,qK:()=>Q,Ub:()=>tv,Cd:()=>tW,Ur:()=>tb,Y_:()=>tf,b3:()=>ea,eU:()=>ty,bV:()=>tl,SP:()=>tU,EB:()=>D,Cq:()=>tw,fB:()=>eG,fk:()=>t_,QY:()=>ei,kN:()=>er,eT:()=>t3,jo:()=>el,az:()=>tG,Lr:()=>eu,gk:()=>eb,b6:()=>ta,mC:()=>ti,H8:()=>eB,Mt:()=>eY,fn:()=>t4,UT:()=>tL,b_:()=>eT,JG:()=>e0,mx:()=>tS,GY:()=>y,findUserById:()=>w,sV:()=>Z,E5:()=>x,Ol:()=>C,kj:()=>tj,uY:()=>tk,Af:()=>ez,SE:()=>tE,XZ:()=>B,s:()=>tC,MZ:()=>eh,_z:()=>e_,sf:()=>eC,rg:()=>tQ,a7:()=>et,Tc:()=>eD,wA:()=>eZ,nr:()=>eI,DX:()=>eO,on:()=>tY,TH:()=>eg,Dv:()=>h,tz:()=>P,wh:()=>tn,w5:()=>eV,Xu:()=>tt,wV:()=>U,rF:()=>ef,or:()=>em,dc:()=>eo,bT:()=>z,M5:()=>S,sL:()=>f,pR:()=>F,bS:()=>Y,OV:()=>$,nb:()=>g,IK:()=>tK,DG:()=>t$,sm:()=>tx,yr:()=>en,do:()=>eA,Pt:()=>e3,WY:()=>J,Zy:()=>X,c7:()=>p,nF:()=>tA,Kp:()=>e1});var i=a(87561),r=a(49411);let s=!1;!function(){if(!s)for(let[e,t]of(s=!0,[[".env",!1],[".env.local",!0]])){let a=(0,r.resolve)(process.cwd(),e);if((0,i.existsSync)(a))for(let e of(0,i.readFileSync)(a,"utf8").split(/\r?\n/)){let a=e.trim();if(!a||a.startsWith("#"))continue;let i=a.indexOf("=");if(-1===i)continue;let r=a.slice(0,i).trim(),s=a.slice(i+1).trim();(s.startsWith('"')&&s.endsWith('"')||s.startsWith("'")&&s.endsWith("'"))&&(s=s.slice(1,-1)),(t||void 0===process.env[r])&&(process.env[r]=s)}}}();var n=a(84770),E=a.n(n),c=a(62418),d=a.n(c),o=a(70446),u=a(68605),T=a(57435);if(!process.env.DATABASE_URL?.trim())throw Error("DATABASE_URL n\xe3o definido. Configure em .env ou .env.local (ex.: mysql://user:pass@127.0.0.1:3306/dataportal).");let l=globalThis.db??d().createPool({uri:process.env.DATABASE_URL,waitForConnections:!0,connectionLimit:10,queueLimit:0,connectTimeout:1e4,enableKeepAlive:!0,keepAliveInitialDelay:1e4});async function L(){try{let e=await l.getConnection();try{return await e.query("SELECT 1"),{ok:!0}}finally{e.release()}}catch(e){return{ok:!1,error:e instanceof Error?e.message:String(e)}}}l.on("error",e=>{T.k.error("db.pool.error",{error:e})});let A=!1;async function N(){if(!A){A=!0;try{let[e]=await l.execute(`SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Category' AND INDEX_NAME = 'Category_name_key'
       LIMIT 1`);e?.length&&await l.execute("ALTER TABLE Category DROP INDEX Category_name_key")}catch(e){T.k.warn("db.category_index_migration_drop_name_only_unique",{error:e})}try{await l.execute("ALTER TABLE Category ADD UNIQUE INDEX Category_name_datatype_key (name, dataType)")}catch{}}}let R=new Map;function I(){R.clear()}let O=!1;async function m(){if(!O){await l.execute(`CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(254) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      email_verified TINYINT(1) NOT NULL DEFAULT 0,
      verification_token VARCHAR(64) NULL,
      verification_expires DATETIME(3) NULL,
      otp_code VARCHAR(6) NULL,
      otp_expires DATETIME(3) NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY users_email_key (email),
      INDEX users_verification_token_idx (verification_token)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);try{await l.execute("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'")}catch{}try{await l.execute("ALTER TABLE users ADD COLUMN reset_code VARCHAR(6) NULL")}catch{}try{await l.execute("ALTER TABLE users ADD COLUMN reset_expires DATETIME(3) NULL")}catch{}try{await l.execute("ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20) NULL")}catch{}try{await l.execute("ALTER TABLE users ADD COLUMN oauth_id VARCHAR(191) NULL")}catch{}try{await l.execute("ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL")}catch{}try{await l.execute("ALTER TABLE users ADD UNIQUE INDEX users_oauth_provider_id_key (oauth_provider, oauth_id)")}catch{}try{await l.execute("ALTER TABLE users ADD COLUMN pending_email VARCHAR(254) NULL")}catch{}try{await l.execute("ALTER TABLE users ADD COLUMN pending_email_code VARCHAR(6) NULL")}catch{}try{await l.execute("ALTER TABLE users ADD COLUMN pending_email_expires DATETIME(3) NULL")}catch{}try{await l.execute("ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64) NULL")}catch{}try{await l.execute("ALTER TABLE users ADD COLUMN totp_enabled TINYINT(1) NOT NULL DEFAULT 0")}catch{}try{await l.execute("ALTER TABLE users ADD COLUMN totp_backup_codes TEXT NULL")}catch{}try{await l.execute("ALTER TABLE users ADD COLUMN profile_category VARCHAR(30) NULL")}catch{}try{await l.execute("ALTER TABLE users ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1")}catch{}try{await l.execute("ALTER TABLE users ADD COLUMN pedido_eliminacao_em DATETIME(3) NULL")}catch{}try{await l.execute("ALTER TABLE users ADD COLUMN receber_notificacoes TINYINT(1) NULL DEFAULT NULL")}catch{}try{let[e]=await l.execute("SELECT COUNT(*) as total FROM users");0===Number(e[0]?.total??0)&&await l.execute(`INSERT INTO users (name, email, password_hash, email_verified, role, created_at)
         SELECT name, email, password, 1, 'admin', createdAt FROM User
         ON DUPLICATE KEY UPDATE email = email`),await l.execute("UPDATE users SET role = 'admin' WHERE email IN (SELECT email FROM User)")}catch{}O=!0}}async function y(e){await m();let[t]=await l.execute("SELECT * FROM users WHERE email = ? LIMIT 1",[e]),a=t[0];return a?{...a,password:a.password_hash,emailVerified:!!a.email_verified,role:(0,o.VA)(a.role)}:null}async function w(e){await m();let[t]=await l.execute("SELECT * FROM users WHERE id = ? LIMIT 1",[e]),a=t[0];return a?{...a,password:a.password_hash,emailVerified:!!a.email_verified,role:(0,o.VA)(a.role)}:null}async function U(e,t){await m();let[a]=await l.execute("SELECT role FROM users WHERE id = ? LIMIT 1",[e]);if("admin"===(0,o.VA)(a[0]?.role)||(process.env.ADMIN_EMAILS||process.env.ADMIN_EMAIL||"").split(",").map(e=>(0,u.R)(e)).filter(Boolean).includes((0,u.R)(t)))return"admin";try{let[e]=await l.execute("SELECT id FROM User WHERE LOWER(email) = ? LIMIT 1",[(0,u.R)(t)]);if(e[0])return"admin"}catch{}return"user"}async function p(e,t){await m(),await l.execute("UPDATE users SET role = ? WHERE id = ?",[t,e])}async function D(){await m();let[e]=await l.execute(`SELECT id, name, email, email_verified, role, created_at, active, receber_notificacoes
     FROM users
     ORDER BY created_at DESC`);return e.map(e=>({id:e.id,name:e.name,email:e.email,emailVerified:!!e.email_verified,role:(0,o.VA)(e.role),createdAt:e.created_at,active:null===e.active||void 0===e.active||!!e.active,receberNotificacoes:null===e.receber_notificacoes||void 0===e.receber_notificacoes?null:!!e.receber_notificacoes}))}async function f(e,t){await m(),await l.execute("UPDATE users SET active = ? WHERE id = ?",[t?1:0,e])}async function S(e,t){await m(),await l.execute("UPDATE users SET receber_notificacoes = ? WHERE id = ?",[t?1:0,e])}async function C(){await m();let[e]=await l.execute("SELECT id, name, email FROM users WHERE receber_notificacoes = 1 AND active = 1 AND role = 'user'");return e.map(e=>({id:e.id,name:e.name,email:e.email}))}async function _(){await m();let[e]=await l.execute("SELECT COUNT(*) as total FROM users");return Number(e[0]?.total??0)}async function M(e){await m();let[t]=await l.execute(`INSERT INTO users (name, email, password_hash, email_verified, verification_token, verification_expires, profile_category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,[e.name,e.email,e.passwordHash,e.emailVerified?1:0,e.verificationToken??null,e.verificationExpires??null,e.profileCategory??null]);return w(t.insertId)}async function x(e){await m();let[t]=await l.execute("SELECT * FROM users WHERE verification_token = ? LIMIT 1",[e]);return t[0]||null}async function h(e){await m(),await l.execute(`UPDATE users
     SET email_verified = 1,
         verification_token = NULL,
         verification_expires = NULL,
         otp_code = NULL,
         otp_expires = NULL
     WHERE id = ?`,[e])}async function g(e,t,a){await m(),await l.execute("UPDATE users SET verification_token = ?, verification_expires = ? WHERE id = ?",[t,a,e])}async function F(e,t,a){await m(),await l.execute("UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?",[t,a,e])}async function H(e){await m(),await l.execute("UPDATE users SET otp_code = NULL, otp_expires = NULL WHERE id = ?",[e])}async function b(e){await m(),await l.execute("DELETE FROM users WHERE id = ?",[e])}async function v(e){await m(),await l.execute("UPDATE users SET pedido_eliminacao_em = NOW() WHERE id = ?",[e])}async function W(e){await m(),await l.execute("UPDATE users SET pedido_eliminacao_em = NULL WHERE id = ?",[e])}async function P(){await m();let[e]=await l.execute(`SELECT id FROM users WHERE pedido_eliminacao_em IS NOT NULL
     AND pedido_eliminacao_em < DATE_SUB(NOW(), INTERVAL 30 DAY)`);for(let t of e)await V(t.id);return e.length}async function V(e){await m();try{await l.execute("DELETE FROM AIInsightTile WHERE userId = ?",[e])}catch{}try{await l.execute("DELETE FROM DatasetUpdateSubscription WHERE userId = ?",[e])}catch{}try{await l.execute("UPDATE Statistic SET userId = NULL WHERE userId = ?",[e])}catch{}await b(e)}async function B(e){await m();let t=await w(e);if(!t)return null;let a=[];try{let[t]=await l.execute("SELECT title, question, datasetIds, shareToken, createdAt FROM AIInsightTile WHERE userId = ? ORDER BY createdAt DESC",[e]);a=t}catch{}return{perfil:{nome:t.name,email:t.email,funcao:t.role,emailVerificado:!!t.emailVerified,criadaEm:t.created_at},analisesGuardadas:a}}async function Y(e,t,a){await m(),await l.execute("UPDATE users SET reset_code = ?, reset_expires = ? WHERE id = ?",[t,a,e])}async function k(e){await m(),await l.execute("UPDATE users SET reset_code = NULL, reset_expires = NULL WHERE id = ?",[e])}async function X(e,t){await m(),await l.execute("UPDATE users SET password_hash = ? WHERE id = ?",[t,e])}async function J(e,t){await m(),await l.execute("UPDATE users SET name = ? WHERE id = ?",[t,e])}async function z(e,t,a,i){await m(),await l.execute("UPDATE users SET pending_email = ?, pending_email_code = ?, pending_email_expires = ? WHERE id = ?",[t,a,i,e])}async function q(e){await m(),await l.execute("UPDATE users SET pending_email = NULL, pending_email_code = NULL, pending_email_expires = NULL WHERE id = ?",[e])}async function K(e,t){await m(),await l.execute("UPDATE users SET email = ?, pending_email = NULL, pending_email_code = NULL, pending_email_expires = NULL WHERE id = ?",[t,e])}async function $(e,t,a){await m(),await l.execute("UPDATE users SET totp_secret = ?, totp_backup_codes = ?, totp_enabled = 0 WHERE id = ?",[t,JSON.stringify(a),e])}async function Q(e){await m(),await l.execute("UPDATE users SET totp_enabled = 1 WHERE id = ?",[e])}async function G(e){await m(),await l.execute("UPDATE users SET totp_enabled = 0, totp_secret = NULL, totp_backup_codes = NULL WHERE id = ?",[e])}async function j(e,t){await m(),await l.execute("UPDATE users SET totp_backup_codes = ? WHERE id = ?",[JSON.stringify(t),e])}async function Z(e,t){await m();let[a]=await l.execute("SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ? LIMIT 1",[e,t]),i=a[0];return i?{...i,password:i.password_hash,emailVerified:!!i.email_verified,role:(0,o.VA)(i.role)}:null}async function ee(e){await m();let[t]=await l.execute(`INSERT INTO users (name, email, password_hash, email_verified, role, oauth_provider, oauth_id)
     VALUES (?, ?, NULL, 1, 'user', ?, ?)`,[e.name,e.email,e.provider,e.oauthId]);return w(t.insertId)}async function et(e,t,a){await m(),await l.execute("UPDATE users SET oauth_provider = ?, oauth_id = ?, email_verified = 1 WHERE id = ?",[t,a,e])}async function ea(){await N();let[e]=await l.execute("SELECT * FROM Category ORDER BY name ASC");return e}async function ei(e){await N();let[t]=await l.execute("SELECT * FROM Category WHERE dataType = ? ORDER BY name ASC",[e]);return t}async function er(e){let[t]=await l.execute("SELECT * FROM Category WHERE id = ? LIMIT 1",[e]);return t[0]||null}async function es(e){await N();let[t]=await l.execute("INSERT INTO Category (name, description, dataType, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())",[e.name,e.description||null,e.dataType||"geoespacial"]);return er(t.insertId)}async function en(e,t){return await l.execute("UPDATE Category SET name = COALESCE(?, name), description = COALESCE(?, description), dataType = COALESCE(?, dataType), updatedAt = NOW() WHERE id = ?",[t.name||null,t.description||null,t.dataType||null,e]),er(e)}async function eE(e){let[t]=await l.execute("SELECT COUNT(*) as total FROM Dataset WHERE categoryId = ?",[e]),a=Number(t[0]?.total??0);return a>0?{ok:!1,erro:`Esta categoria tem ${a} dataset(s) associado(s); mude-os de categoria antes de a eliminar.`,totalDatasets:a}:(await l.execute("DELETE FROM Category WHERE id = ?",[e]),{ok:!0})}let ec=!1;async function ed(){if(!ec)for(let[e,t]of(ec=!0,[["previewAvailable","TINYINT(1) NULL"],["bboxMinX","DOUBLE NULL"],["bboxMinY","DOUBLE NULL"],["bboxMaxX","DOUBLE NULL"],["bboxMaxY","DOUBLE NULL"],["certificacao","VARCHAR(30) NOT NULL DEFAULT 'nao_verificado'"],["resumoIA","TEXT NULL"],["resumoIAGeradoEm","DATETIME(3) NULL"],["downloadPublico","TINYINT(1) NOT NULL DEFAULT 0"]]))try{await l.execute(`ALTER TABLE Dataset ADD COLUMN ${e} ${t}`)}catch{}}async function eo(e,t){await ed(),await l.execute("UPDATE Dataset SET previewAvailable = ?, bboxMinX = ?, bboxMinY = ?, bboxMaxX = ?, bboxMaxY = ? WHERE id = ?",[t.previewAvailable?1:0,t.bbox?.[0]??null,t.bbox?.[1]??null,t.bbox?.[2]??null,t.bbox?.[3]??null,e]),I()}async function eu(e){await ed();let t=JSON.stringify(e),a=R.get(t);if(a&&a.expiresAt>Date.now())return a.value;let{dataType:i,categoryId:r,search:s,source:n,format:E,year:c,yearFrom:d,yearTo:o,sortOrder:u,offset:T=0,take:L=10}=e,A=[],N=[];i&&(A.push("d.dataType = ?"),N.push(i)),r&&(A.push("d.categoryId = ?"),N.push(r)),E&&(A.push("d.format = ?"),N.push(E)),n&&(A.push("d.source = ?"),N.push(n)),c&&(A.push("d.year = ?"),N.push(c)),d&&(A.push("d.year >= ?"),N.push(d)),o&&(A.push("d.year <= ?"),N.push(o)),s&&(A.push("(d.title LIKE ? OR d.description LIKE ? OR d.keywords LIKE ?)"),N.push(`%${s}%`,`%${s}%`,`%${s}%`));let I=A.length?`WHERE ${A.join(" AND ")}`:"",O=!!s?.trim(),m=O?`, (
        (CASE WHEN d.title LIKE ? THEN 3 ELSE 0 END) +
        (CASE WHEN d.description LIKE ? THEN 2 ELSE 0 END) +
        (CASE WHEN d.keywords LIKE ? THEN 1 ELSE 0 END)
      ) AS relevance`:"",y=O?[`%${s}%`,`%${s}%`,`%${s}%`]:[];N.push(T,L);let w=N.slice(0,N.length-2),U=N.slice(N.length-2),p=O?[...y,...w,...U]:[...w,...U],[D]=await l.execute(`SELECT d.*${m}, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType
     FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id
     ${I} ${"oldest"===u?"ORDER BY d.year ASC":"newest"===u?"ORDER BY d.year DESC":O?"ORDER BY relevance DESC, d.views DESC, d.downloads DESC":"ORDER BY d.views DESC, d.downloads DESC"} LIMIT ?, ?`,p),f=D.map(e=>({...e,category:{id:e.cat_id,name:e.cat_name,description:e.cat_desc,dataType:e.cat_dataType}}));return R.set(t,{expiresAt:Date.now()+6e4,value:f}),f}async function eT(e,t=4){let a=e.categoryId?(await l.execute(`SELECT d.id, d.title, d.format, d.dataType, c.name as cat_name
         FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id
         WHERE d.categoryId = ? AND d.id != ?
         ORDER BY d.views DESC, d.downloads DESC LIMIT ?`,[e.categoryId,e.id,t]))[0]:[];if(a.length<t){let i=[e.id,...a.map(e=>e.id)],r=i.map(()=>"?").join(","),[s]=await l.execute(`SELECT d.id, d.title, d.format, d.dataType, c.name as cat_name
       FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id
       WHERE d.dataType = ? AND d.id NOT IN (${r})
       ORDER BY d.views DESC, d.downloads DESC LIMIT ?`,[e.dataType,...i,t-a.length]);a=[...a,...s]}return a.map(e=>({id:e.id,title:e.title,format:e.format,dataType:e.dataType,category:e.cat_name}))}async function el(e){await ed();let[t]=await l.execute(`SELECT d.*, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType
     FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id WHERE d.id = ? LIMIT 1`,[e]);if(!t[0])return null;let a=t[0];return{...a,category:{id:a.cat_id,name:a.cat_name,description:a.cat_desc,dataType:a.cat_dataType}}}async function eL(e){await ed();let[t]=await l.execute(`INSERT INTO Dataset (title, description, categoryId, source, year, format, fileSize, filePath, geometry, coverage, minimumUnit, keywords, dataType, downloadPublico, views, downloads, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW(), NOW())`,[e.title,e.description,e.categoryId,e.source||"",e.year||new Date().getFullYear(),e.format,e.fileSize||"",e.filePath||"",e.geometry||null,e.coverage||null,e.minimumUnit||null,e.keywords||null,e.dataType||"geoespacial",e.downloadPublico?1:0]);return I(),el(t.insertId)}async function eA(e,t,a){await ed();try{await eR();let[t]=await l.execute("SELECT * FROM Dataset WHERE id = ?",[e]);t[0]&&await l.execute("INSERT INTO DatasetVersao (datasetId, dados, editadoPor) VALUES (?, ?, ?)",[e,JSON.stringify(t[0]),a||"sistema"])}catch(t){T.k.error("erro_registar_versao_dataset",{error:t,id:e})}return await l.execute(`UPDATE Dataset SET title=?, description=?, categoryId=?, source=?, year=?, format=?, fileSize=?, filePath=?,
     geometry=?, coverage=?, minimumUnit=?, keywords=?, dataType=?, downloadPublico=?, updatedAt=NOW() WHERE id=?`,[t.title,t.description,t.categoryId,t.source,t.year,t.format,t.fileSize,t.filePath,t.geometry||null,t.coverage||null,t.minimumUnit||null,t.keywords||null,t.dataType||"geoespacial",t.downloadPublico?1:0,e]),I(),el(e)}let eN=!1;async function eR(){eN||(await l.execute(`CREATE TABLE IF NOT EXISTS DatasetVersao (
      id INT NOT NULL AUTO_INCREMENT,
      datasetId INT NOT NULL,
      dados JSON NOT NULL,
      editadoPor VARCHAR(254) NOT NULL,
      criadoEm DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX datasetversao_datasetid_idx (datasetId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),eN=!0)}async function eI(e){await eR();let[t]=await l.execute("SELECT id, dados, editadoPor, criadoEm FROM DatasetVersao WHERE datasetId = ? ORDER BY criadoEm DESC LIMIT 50",[e]);return t.map(e=>{let t="string"==typeof e.dados?JSON.parse(e.dados):e.dados;return{versaoId:e.id,editadoPor:e.editadoPor,criadoEm:e.criadoEm,titulo:t.title,descricao:t.description,ano:t.year,filePath:t.filePath}})}async function eO(e,t=10){return(await eI(e)).slice(0,t).map(e=>({versaoId:e.versaoId,criadoEm:e.criadoEm,titulo:e.titulo,ano:e.ano}))}async function em(e,t){await eR();let[a]=await l.execute("SELECT * FROM DatasetVersao WHERE id = ?",[e]),i=a[0];if(!i)return{ok:!1,erro:"Vers\xe3o n\xe3o encontrada."};let r="string"==typeof i.dados?JSON.parse(i.dados):i.dados;return await eA(i.datasetId,r,`${t} (restauro da vers\xe3o #${e})`),{ok:!0,id:i.datasetId}}async function ey(e,t){await ed(),await l.execute("UPDATE Dataset SET certificacao = ? WHERE id = ?",[t,e]),I()}let ew=!1;async function eU(){ew||(await l.execute(`CREATE TABLE IF NOT EXISTS LixeiraDataset (
      id INT NOT NULL AUTO_INCREMENT,
      datasetId INT NOT NULL,
      dados JSON NOT NULL,
      eliminadoPor VARCHAR(254) NOT NULL,
      eliminadoEm DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      restauradoEm DATETIME(3) NULL,
      PRIMARY KEY (id),
      INDEX lixeiradataset_datasetid_idx (datasetId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),ew=!0)}async function ep(e,t){await eU();let[a]=await l.execute("SELECT * FROM Dataset WHERE id = ?",[e]),i=a[0];i&&(await l.execute("INSERT INTO LixeiraDataset (datasetId, dados, eliminadoPor) VALUES (?, ?, ?)",[e,JSON.stringify(i),t]),await l.execute("DELETE FROM Dataset WHERE id = ?",[e]),I())}async function eD(){await eU();let[e]=await l.execute(`SELECT id, datasetId, dados, eliminadoPor, eliminadoEm
     FROM LixeiraDataset WHERE restauradoEm IS NULL ORDER BY eliminadoEm DESC LIMIT 200`);return e.map(e=>{let t;try{t="string"==typeof e.dados?JSON.parse(e.dados):e.dados}catch{return null}return{lixeiraId:e.id,datasetId:e.datasetId,titulo:t?.title,categoriaId:t?.categoryId,dataType:t?.dataType,eliminadoPor:e.eliminadoPor,eliminadoEm:e.eliminadoEm}}).filter(e=>null!==e)}async function ef(e){await eU();let[t]=await l.execute("SELECT * FROM LixeiraDataset WHERE id = ? AND restauradoEm IS NULL",[e]),a=t[0];if(!a)return{ok:!1,erro:"Registo da lixeira n\xe3o encontrado (pode j\xe1 ter sido restaurado)."};let i="string"==typeof a.dados?JSON.parse(a.dados):a.dados,[r]=await l.execute("SELECT id FROM Dataset WHERE id = ?",[i.id]);return r[0]?{ok:!1,erro:"J\xe1 existe um dataset com este id; n\xe3o \xe9 poss\xedvel restaurar automaticamente."}:(await l.execute(`INSERT INTO Dataset
     (id, title, description, categoryId, source, year, format, fileSize, filePath, geometry, coverage,
      minimumUnit, keywords, dataType, views, downloads, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,[i.id,i.title,i.description,i.categoryId,i.source,i.year,i.format,i.fileSize,i.filePath,i.geometry,i.coverage,i.minimumUnit,i.keywords,i.dataType,i.views??0,i.downloads??0,i.createdAt]),await l.execute("UPDATE LixeiraDataset SET restauradoEm = NOW() WHERE id = ?",[e]),I(),{ok:!0,id:i.id})}async function eS(e){await eU(),await l.execute("DELETE FROM LixeiraDataset WHERE id = ?",[e])}async function eC(e){await l.execute("UPDATE Dataset SET views = views + 1 WHERE id = ?",[e])}async function e_(e){await l.execute("UPDATE Dataset SET downloads = downloads + 1 WHERE id = ?",[e])}let eM=!1;async function ex(){eM||(eM=!0,await l.execute(`CREATE TABLE IF NOT EXISTS DailyUsageStat (
      date DATE NOT NULL,
      views INT NOT NULL DEFAULT 0,
      downloads INT NOT NULL DEFAULT 0,
      viewsAlertedThreshold INT NOT NULL DEFAULT 0,
      downloadsAlertedThreshold INT NOT NULL DEFAULT 0,
      PRIMARY KEY (date)
    )`))}async function eh(e){await ex(),"views"===e?await l.execute(`INSERT INTO DailyUsageStat (date, views) VALUES (CURDATE(), 1)
       ON DUPLICATE KEY UPDATE views = views + 1`):await l.execute(`INSERT INTO DailyUsageStat (date, downloads) VALUES (CURDATE(), 1)
       ON DUPLICATE KEY UPDATE downloads = downloads + 1`);let[t]=await l.execute("SELECT views, downloads, viewsAlertedThreshold, downloadsAlertedThreshold FROM DailyUsageStat WHERE date = CURDATE()"),a=t[0];return a?"views"===e?{count:Number(a.views),alertedThreshold:Number(a.viewsAlertedThreshold)}:{count:Number(a.downloads),alertedThreshold:Number(a.downloadsAlertedThreshold)}:null}async function eg(e,t){await ex(),"views"===e?await l.execute("UPDATE DailyUsageStat SET viewsAlertedThreshold = ? WHERE date = CURDATE()",[t]):await l.execute("UPDATE DailyUsageStat SET downloadsAlertedThreshold = ? WHERE date = CURDATE()",[t])}async function eF(){let[e]=await l.execute("SELECT COUNT(*) as total FROM Dataset");return e[0].total}async function eH(){let[[e],[t],[a],[i]]=await Promise.all([l.execute("SELECT COUNT(*) as total FROM Dataset WHERE dataType = 'geoespacial'"),l.execute("SELECT COUNT(*) as total FROM Dataset WHERE dataType = 'alfanumerico'"),l.execute("SELECT COUNT(*) as total FROM AlphanumericDashboard"),l.execute("SELECT COUNT(*) as total FROM Report")]);return{geoespaciais:Number(e[0]?.total??0),alfanumericos:Number(t[0]?.total??0),mapas:0,dashboards:Number(a[0]?.total??0),relatorios:Number(i[0]?.total??0)}}async function eb(e){if(0===e.length)return[];await ed();let t=e.map(()=>"?").join(","),[a]=await l.execute(`SELECT d.*, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType
     FROM Dataset d LEFT JOIN Category c ON d.categoryId = c.id WHERE d.id IN (${t})`,e);return a.map(e=>({...e,category:{id:e.cat_id,name:e.cat_name,description:e.cat_desc,dataType:e.cat_dataType}}))}let ev=!1;async function eW(){ev||(await l.execute(`CREATE TABLE IF NOT EXISTS DatasetFavorite (
      id INT NOT NULL AUTO_INCREMENT,
      userId INT NOT NULL,
      datasetId INT NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY DatasetFavorite_user_dataset_key (userId, datasetId),
      INDEX DatasetFavorite_userId_idx (userId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),ev=!0)}async function eP(e,t){await eW(),await l.execute("INSERT IGNORE INTO DatasetFavorite (userId, datasetId) VALUES (?, ?)",[e,t])}async function eV(e,t){await eW(),await l.execute("DELETE FROM DatasetFavorite WHERE userId = ? AND datasetId = ?",[e,t])}async function eB(e){await eW();let[t]=await l.execute("SELECT datasetId FROM DatasetFavorite WHERE userId = ?",[e]);return t.map(e=>e.datasetId)}async function eY(e){await eW(),await ed();let[t]=await l.execute(`SELECT d.*, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType,
            f.createdAt as favoritedAt
     FROM DatasetFavorite f
     INNER JOIN Dataset d ON d.id = f.datasetId
     LEFT JOIN Category c ON d.categoryId = c.id
     WHERE f.userId = ?
     ORDER BY f.createdAt DESC`,[e]);return t.map(e=>({...e,category:{id:e.cat_id,name:e.cat_name,description:e.cat_desc,dataType:e.cat_dataType}}))}let ek=!1;async function eX(){if(!ek){ek=!0;try{await l.execute("ALTER TABLE Statistic ADD COLUMN userId INT NULL")}catch{}try{await l.execute("CREATE INDEX Statistic_userId_idx ON Statistic (userId)")}catch{}}}async function eJ(e,t,a){await eX(),await l.execute("INSERT INTO Statistic (datasetId, type, userId, createdAt) VALUES (?, ?, ?, NOW())",[e,t,a??null])}async function ez(e=50){await eX();let[t]=await l.execute(`SELECT
       s.id,
       s.type,
       s.createdAt,
       u.id as userId,
       u.name as userName,
       u.email as userEmail,
       d.id as datasetId,
       d.title as datasetTitle
     FROM Statistic s
     INNER JOIN users u ON u.id = s.userId
     INNER JOIN Dataset d ON d.id = s.datasetId
     WHERE s.userId IS NOT NULL
     ORDER BY s.createdAt DESC
     LIMIT ?`,[e]);return t}let eq=!1;async function eK(){if(!eq){eq=!0;try{await l.execute("ALTER TABLE Report ADD COLUMN sector VARCHAR(80) NULL")}catch{}}}let e$=!1;async function eQ(){if(!e$){e$=!0;try{await l.execute("ALTER TABLE Report ADD COLUMN origem VARCHAR(20) NULL")}catch{}try{await l.execute("ALTER TABLE Report ADD COLUMN uploaded_by_user_id INT NULL")}catch{}}}async function eG(){await eK(),await eQ();let[e]=await l.execute("SELECT * FROM Report WHERE origem IS NULL OR origem = 'oficial' ORDER BY createdAt DESC");return e}async function ej(e){await eK(),await eQ();let t=new Date().getFullYear(),[a]=await l.execute(`INSERT INTO Report (title, year, coverage, filePath, fileSize, origem, uploaded_by_user_id, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'utilizador', ?, NOW(), NOW())`,[e.title,t,"Enviado por utilizador",e.filePath,e.fileSize,e.userId]);return e0(a.insertId)}async function eZ(){await eQ();let[e]=await l.execute(`SELECT r.id, r.title, r.filePath, r.fileSize, r.createdAt,
            u.name AS utilizadorNome, u.email AS utilizadorEmail
     FROM Report r
     LEFT JOIN users u ON u.id = r.uploaded_by_user_id
     WHERE r.origem = 'utilizador'
     ORDER BY r.createdAt DESC`);return e.map(e=>({id:Number(e.id),title:String(e.title),filePath:e.filePath||null,fileSize:e.fileSize||null,createdAt:new Date(e.createdAt).toISOString(),utilizadorNome:e.utilizadorNome||null,utilizadorEmail:e.utilizadorEmail||null}))}async function e0(e){await eK(),await eQ();let[t]=await l.execute("SELECT * FROM Report WHERE id = ? LIMIT 1",[e]);return t[0]||null}function e1(e){for(let[t,a]of[["T\xedtulo",e.title],["Cobertura",e.coverage],["Autor",e.author],["Parceiros",e.partners]])if(a&&a.length>500)return`${t} tem ${a.length} caracteres; o m\xe1ximo permitido \xe9 500.`;return null}async function e4(e){await eK();let[t]=await l.execute("INSERT INTO Report (title, year, coverage, author, partners, filePath, fileSize, detailsText, sector, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",[e.title,e.year,e.coverage,e.author||null,e.partners||null,e.filePath||null,e.fileSize||null,e.detailsText||null,e.sector||null]);return e0(t.insertId)}async function e3(e,t){return await eK(),await l.execute("UPDATE Report SET title=?, year=?, coverage=?, author=?, partners=?, filePath=?, fileSize=?, detailsText=?, sector=?, updatedAt=NOW() WHERE id=?",[t.title,t.year,t.coverage,t.author||null,t.partners||null,t.filePath||null,t.fileSize||null,t.detailsText||null,t.sector||null,e]),e0(e)}async function e8(e){await l.execute("DELETE FROM Report WHERE id = ?",[e])}async function e5(e,t){await e6(),await l.execute("INSERT INTO ReportRequest (reportId, name, email, message, createdAt) VALUES (?, ?, ?, ?, NOW())",[e,t?.name||null,t?.email||null,t?.message||null])}let e2=!1;async function e6(){if(!e2){for(let[e,t]of(await l.execute(`CREATE TABLE IF NOT EXISTS ReportRequest (
      id INTEGER NOT NULL AUTO_INCREMENT,
      reportId INTEGER NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX ReportRequest_reportId_idx (reportId),
      INDEX ReportRequest_createdAt_idx (createdAt)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),[["name","VARCHAR(120) NULL"],["email","VARCHAR(254) NULL"],["message","TEXT NULL"]]))try{await l.execute(`ALTER TABLE ReportRequest ADD COLUMN ${e} ${t}`)}catch{}e2=!0}}let e9=!1;async function e7(){e9||(await l.execute(`CREATE TABLE IF NOT EXISTS EntityFavorite (
      id INT NOT NULL AUTO_INCREMENT,
      userId INT NOT NULL,
      entityType VARCHAR(20) NOT NULL,
      entityId VARCHAR(64) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY EntityFavorite_user_entity_key (userId, entityType, entityId),
      INDEX EntityFavorite_userId_idx (userId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),e9=!0)}async function te(e,t,a){await e7(),await l.execute("INSERT IGNORE INTO EntityFavorite (userId, entityType, entityId) VALUES (?, ?, ?)",[e,t,a])}async function tt(e,t,a){await e7(),await l.execute("DELETE FROM EntityFavorite WHERE userId = ? AND entityType = ? AND entityId = ?",[e,t,a])}async function ta(e,t){await e7();let[a]=await l.execute("SELECT entityId FROM EntityFavorite WHERE userId = ? AND entityType = ?",[e,t]);return a.map(e=>e.entityId)}async function ti(e,t){if(await e7(),"dashboard"===t){await tD();let[t]=await l.execute(`SELECT d.* FROM EntityFavorite f
       INNER JOIN AlphanumericDashboard d ON d.id = f.entityId
       WHERE f.userId = ? AND f.entityType = 'dashboard'
       ORDER BY f.createdAt DESC`,[e]);return t}if("report"===t){let[t]=await l.execute(`SELECT r.* FROM EntityFavorite f
       INNER JOIN Report r ON r.id = f.entityId
       WHERE f.userId = ? AND f.entityType = 'report'
       ORDER BY f.createdAt DESC`,[e]);return t}return ta(e,"map")}let tr=!1;async function ts(){tr||(await l.execute(`CREATE TABLE IF NOT EXISTS MapStat (
      id INT NOT NULL AUTO_INCREMENT,
      slug VARCHAR(80) NOT NULL,
      type VARCHAR(20) NOT NULL,
      userId INT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX MapStat_slug_idx (slug),
      INDEX MapStat_slug_type_idx (slug, type)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),tr=!0)}async function tn(e,t,a){await ts(),await l.execute("INSERT INTO MapStat (slug, type, userId) VALUES (?, ?, ?)",[e,t,a??null])}async function tE(){await ts();let[e]=await l.execute("SELECT slug, COUNT(*) as total FROM MapStat WHERE type = 'view' GROUP BY slug"),t={};for(let a of e)t[a.slug]=Number(a.total);return t}let tc=!1;async function td(){tc||(await l.execute(`CREATE TABLE IF NOT EXISTS MapRequest (
      id INT NOT NULL AUTO_INCREMENT,
      slug VARCHAR(80) NOT NULL,
      name VARCHAR(120) NULL,
      email VARCHAR(254) NULL,
      message TEXT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX MapRequest_slug_idx (slug)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),tc=!0)}async function to(e){await td(),await l.execute("INSERT INTO MapRequest (slug, name, email, message) VALUES (?, ?, ?, ?)",[e.slug,e.name||null,e.email||null,e.message||null])}let tu=!1;async function tT(){tu||(await l.execute(`CREATE TABLE IF NOT EXISTS MapOverride (
      slug VARCHAR(80) NOT NULL,
      title VARCHAR(255) NULL,
      subtitle VARCHAR(255) NULL,
      description TEXT NULL,
      coverage VARCHAR(255) NULL,
      category VARCHAR(120) NULL,
      badgesJson TEXT NULL,
      highlightsJson TEXT NULL,
      featured TINYINT(1) NULL,
      heroStatValue VARCHAR(40) NULL,
      heroStatLabel VARCHAR(80) NULL,
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (slug)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),tu=!0)}async function tl(){await tT();let[e]=await l.execute("SELECT * FROM MapOverride");return e}async function tL(e){await tT();let[t]=await l.execute("SELECT * FROM MapOverride WHERE slug = ? LIMIT 1",[e]);return t[0]||null}async function tA(e,t){await tT(),await l.execute(`INSERT INTO MapOverride (slug, title, subtitle, description, coverage, category, badgesJson, highlightsJson, featured, heroStatValue, heroStatLabel)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title), subtitle = VALUES(subtitle), description = VALUES(description),
       coverage = VALUES(coverage), category = VALUES(category), badgesJson = VALUES(badgesJson),
       highlightsJson = VALUES(highlightsJson), featured = VALUES(featured),
       heroStatValue = VALUES(heroStatValue), heroStatLabel = VALUES(heroStatLabel)`,[e,t.title??null,t.subtitle??null,t.description??null,t.coverage??null,t.category??null,t.badgesJson??null,t.highlightsJson??null,null==t.featured?null:t.featured?1:0,t.heroStatValue??null,t.heroStatLabel??null])}async function tN(e){await tT(),await l.execute("DELETE FROM MapOverride WHERE slug = ?",[e])}async function tR(){await e6();let[e]=await l.execute("SELECT COUNT(*) as total FROM ReportRequest");return Number(e[0]?.total??0)}let tI=!1;async function tO(){if(!tI){tI=!0;try{await l.execute("ALTER TABLE ContactMessage ADD COLUMN purpose VARCHAR(60) NULL")}catch{}}}async function tm(e){await tO(),await l.execute("INSERT INTO ContactMessage (name, email, subject, message, purpose, createdAt) VALUES (?, ?, ?, ?, ?, NOW())",[e.name,e.email,e.subject,e.message,e.purpose??null])}async function ty(e=100){let[t]=await l.execute(`SELECT * FROM ContactMessage ORDER BY createdAt DESC LIMIT ${Math.max(1,Math.min(500,Math.floor(e)))}`);return t}async function tw(e=100){await e6();let[t]=await l.execute(`SELECT rr.id, rr.reportId, rr.name, rr.email, rr.message, rr.createdAt, r.title as reportTitle, r.year as reportYear
     FROM ReportRequest rr
     LEFT JOIN Report r ON r.id = rr.reportId
     ORDER BY rr.createdAt DESC
     LIMIT ${Math.max(1,Math.min(500,Math.floor(e)))}`);return t}async function tU(e=100){await td();let[t]=await l.execute(`SELECT * FROM MapRequest ORDER BY createdAt DESC LIMIT ${Math.max(1,Math.min(500,Math.floor(e)))}`);return t}let tp=!1;async function tD(){if(!tp){await l.execute(`CREATE TABLE IF NOT EXISTS AlphanumericDashboard (
      id INTEGER NOT NULL AUTO_INCREMENT,
      name VARCHAR(191) NOT NULL,
      dashboardUrl TEXT NOT NULL,
      description TEXT NULL,
      previewImagePath TEXT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);try{await l.execute("ALTER TABLE AlphanumericDashboard ADD COLUMN previewImagePath TEXT NULL")}catch{}try{await l.execute("ALTER TABLE AlphanumericDashboard ADD COLUMN category VARCHAR(191) NULL")}catch{}try{await l.execute("ALTER TABLE AlphanumericDashboard ADD COLUMN views INT NOT NULL DEFAULT 0")}catch{}try{await l.execute("ALTER TABLE AlphanumericDashboard ADD COLUMN lastDataUpdate DATE NULL")}catch{}tp=!0}}async function tf(){await tD();let[e]=await l.execute("SELECT * FROM AlphanumericDashboard ORDER BY views DESC, createdAt DESC");return e}async function tS(e=2){await tD();let[t]=await l.execute(`SELECT * FROM AlphanumericDashboard ORDER BY views DESC, createdAt DESC LIMIT ${Math.max(1,Math.min(20,Math.floor(e)))}`);return t}async function tC(e){return await tD(),await l.execute("UPDATE AlphanumericDashboard SET views = views + 1, updatedAt = NOW() WHERE id = ?",[e]),t_(e)}async function t_(e){await tD();let[t]=await l.execute("SELECT * FROM AlphanumericDashboard WHERE id = ? LIMIT 1",[e]);return t[0]||null}async function tM(e){await tD();let[t]=await l.execute("INSERT INTO AlphanumericDashboard (name, dashboardUrl, description, previewImagePath, category, lastDataUpdate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",[e.name,e.dashboardUrl,e.description||null,e.previewImagePath||null,e.category||null,e.lastDataUpdate||null]);return t_(t.insertId)}async function tx(e,t){return await tD(),await l.execute("UPDATE AlphanumericDashboard SET name=?, dashboardUrl=?, description=?, previewImagePath=?, category=?, lastDataUpdate=?, updatedAt=NOW() WHERE id=?",[t.name,t.dashboardUrl,t.description||null,t.previewImagePath||null,t.category||null,t.lastDataUpdate||null,e]),t_(e)}async function th(e){await tD(),await l.execute("DELETE FROM AlphanumericDashboard WHERE id = ?",[e])}let tg=!1;async function tF(){tg||(await l.execute(`CREATE TABLE IF NOT EXISTS AIInsightTile (
      id INT NOT NULL AUTO_INCREMENT,
      userId INT NOT NULL,
      title VARCHAR(191) NOT NULL,
      question TEXT NOT NULL,
      datasetIds TEXT NOT NULL,
      resultJson LONGTEXT NOT NULL,
      shareToken VARCHAR(64) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY AIInsightTile_shareToken_key (shareToken),
      INDEX AIInsightTile_userId_idx (userId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),tg=!0)}async function tH(e){await tF();let t=E().randomBytes(16).toString("hex"),[a]=await l.execute("INSERT INTO AIInsightTile (userId, title, question, datasetIds, resultJson, shareToken) VALUES (?, ?, ?, ?, ?, ?)",[e.userId,e.title,e.question,JSON.stringify(e.datasetIds),JSON.stringify(e.result),t]);return tv(a.insertId,e.userId)}async function tb(e){await tF();let[t]=await l.execute("SELECT * FROM AIInsightTile WHERE userId = ? ORDER BY createdAt DESC",[e]);return t}async function tv(e,t){await tF();let[a]=await l.execute("SELECT * FROM AIInsightTile WHERE id = ? AND userId = ? LIMIT 1",[e,t]);return a[0]||null}async function tW(e){await tF();let[t]=await l.execute("SELECT * FROM AIInsightTile WHERE shareToken = ? LIMIT 1",[e]);return t[0]||null}async function tP(e,t){await tF(),await l.execute("DELETE FROM AIInsightTile WHERE id = ? AND userId = ?",[e,t])}let tV=!1;async function tB(){tV||(await l.execute(`CREATE TABLE IF NOT EXISTS AIInsightQuery (
      id INT NOT NULL AUTO_INCREMENT,
      userId INT NOT NULL,
      question TEXT NOT NULL,
      datasetIds TEXT NOT NULL,
      confidence VARCHAR(20) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX AIInsightQuery_userId_idx (userId),
      INDEX AIInsightQuery_createdAt_idx (createdAt)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),tV=!0)}async function tY(e){await tB(),await l.execute("INSERT INTO AIInsightQuery (userId, question, datasetIds, confidence) VALUES (?, ?, ?, ?)",[e.userId,e.question,JSON.stringify(e.datasetIds),e.confidence||null])}async function tk(){await tB();let[e]=await l.execute(`SELECT COUNT(*) as totalQueries, COUNT(DISTINCT userId) as totalUsers,
       SUM(CASE WHEN createdAt >= DATE(NOW()) THEN 1 ELSE 0 END) as todayQueries
     FROM (
       SELECT userId, createdAt FROM AIInsightQuery
       UNION ALL
       SELECT utilizador_id as userId, criado_em as createdAt FROM analises WHERE utilizador_id IS NOT NULL
     ) t`),[t]=await l.execute(`SELECT u.id as userId, u.name, u.email,
       COUNT(t.createdAt) as totalQueries,
       SUM(CASE WHEN t.createdAt >= DATE(NOW()) THEN 1 ELSE 0 END) as todayQueries,
       MAX(t.createdAt) as lastQueryAt
     FROM (
       SELECT userId, createdAt FROM AIInsightQuery
       UNION ALL
       SELECT utilizador_id as userId, criado_em as createdAt FROM analises WHERE utilizador_id IS NOT NULL
     ) t
     JOIN users u ON u.id = t.userId
     GROUP BY u.id, u.name, u.email
     ORDER BY totalQueries DESC
     LIMIT 50`),[a]=await l.execute(`SELECT t.id, t.question, t.createdAt, u.name, u.email FROM (
       SELECT CAST(id AS CHAR) as id, CONVERT(question USING utf8mb4) COLLATE utf8mb4_unicode_ci as question, userId, createdAt FROM AIInsightQuery
       UNION ALL
       SELECT CAST(id AS CHAR) as id, CONVERT(pergunta USING utf8mb4) COLLATE utf8mb4_unicode_ci as question, utilizador_id as userId, criado_em as createdAt FROM analises WHERE utilizador_id IS NOT NULL
     ) t
     JOIN users u ON u.id = t.userId
     ORDER BY t.createdAt DESC
     LIMIT 30`),i=await tJ();return{totals:e[0]??{totalQueries:0,totalUsers:0,todayQueries:0},byUser:t,recent:a,tendencias:i}}let tX={exploratorio:"Explorat\xf3rio",comparativo:"Comparativo",temporal:"Tend\xeancia temporal",geoespacial:"Geoespacial",ranking:"Ranking / extremos",diagnostico:"Diagn\xf3stico",preditivo:"Preditivo",executivo:"Resumo executivo",monitorizacao:"Monitoriza\xe7\xe3o",narrativo:"Narrativo"};async function tJ(){let[e]=await l.execute("SELECT arquetipo, datasets_ids FROM analises WHERE datasets_ids IS NOT NULL"),[t]=await l.execute("SELECT datasetIds FROM AIInsightQuery"),a=new Map,i=new Map;for(let t of e){t.arquetipo&&a.set(t.arquetipo,(a.get(t.arquetipo)||0)+1);let e=[];try{e="string"==typeof t.datasets_ids?JSON.parse(t.datasets_ids):t.datasets_ids||[]}catch{continue}for(let t of e)i.set(t,(i.get(t)||0)+1)}for(let e of t){let t=[];try{t=JSON.parse(e.datasetIds)}catch{continue}for(let e of t)i.set(e,(i.get(e)||0)+1)}let r=Array.from(i.keys()),s=new Map((r.length>0?await eb(r):[]).map(e=>[e.id,e])),n=new Map;return i.forEach((e,t)=>{let a=s.get(t)?.category?.name||"Sem categoria";n.set(a,(n.get(a)||0)+e)}),{porArquetipo:Array.from(a.entries()).map(([e,t])=>({arquetipo:e,rotulo:tX[e]||e,total:t})).sort((e,t)=>t.total-e.total),porCategoriaDataset:Array.from(n.entries()).map(([e,t])=>({categoria:e,total:t})).sort((e,t)=>t.total-e.total),porDataset:Array.from(i.entries()).map(([e,t])=>({datasetId:e,titulo:s.get(e)?.title||`Dataset #${e}`,categoria:s.get(e)?.category?.name||"Sem categoria",total:t})).sort((e,t)=>t.total-e.total).slice(0,15)}}let tz=!1;async function tq(){tz||(await l.execute(`CREATE TABLE IF NOT EXISTS DatasetUpdateSubscription (
      id INT NOT NULL AUTO_INCREMENT,
      userId INT NOT NULL,
      datasetId INT NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY DatasetUpdateSubscription_user_dataset_key (userId, datasetId),
      INDEX DatasetUpdateSubscription_datasetId_idx (datasetId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),tz=!0)}async function tK(e,t){await tq(),await l.execute("INSERT IGNORE INTO DatasetUpdateSubscription (userId, datasetId) VALUES (?, ?)",[e,t])}async function t$(e,t){await tq(),await l.execute("DELETE FROM DatasetUpdateSubscription WHERE userId = ? AND datasetId = ?",[e,t])}async function tQ(e,t){await tq();let[a]=await l.execute("SELECT id FROM DatasetUpdateSubscription WHERE userId = ? AND datasetId = ? LIMIT 1",[e,t]);return a.length>0}async function tG(e){await tq();let[t]=await l.execute(`SELECT u.email FROM DatasetUpdateSubscription s
     JOIN users u ON u.id = s.userId
     WHERE s.datasetId = ?`,[e]);return t.map(e=>e.email)}async function tj(e){await tF();let[t]=await l.execute(`SELECT t.userId, t.question, t.datasetIds, u.email
     FROM AIInsightTile t JOIN users u ON u.id = t.userId
     ORDER BY t.createdAt DESC`),a=new Set,i=[];for(let r of t){if(a.has(r.userId))continue;let t=[];try{t=JSON.parse(r.datasetIds)}catch{continue}t.includes(e)&&(a.add(r.userId),i.push({email:r.email,pergunta:r.question,datasetIdsRaw:r.datasetIds}))}return i}let tZ=!1;async function t0(){tZ||(await l.execute(`CREATE TABLE IF NOT EXISTS Feedback (
      id INT NOT NULL AUTO_INCREMENT,
      userId INT NULL,
      nome VARCHAR(150) NOT NULL,
      email VARCHAR(254) NOT NULL,
      mensagem TEXT NOT NULL,
      paginaOrigem VARCHAR(500) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      INDEX Feedback_createdAt_idx (createdAt)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),tZ=!0)}async function t1(e){await t0(),await l.execute("INSERT INTO Feedback (userId, nome, email, mensagem, paginaOrigem, createdAt) VALUES (?, ?, ?, ?, ?, NOW())",[e.userId||null,e.nome,e.email,e.mensagem,e.paginaOrigem||null])}async function t4(){await t0();let[e]=await l.execute("SELECT * FROM Feedback ORDER BY createdAt DESC");return e}async function t3(){let e=new Date(Date.now()-6048e5),[t]=await l.execute("SELECT id, title FROM Dataset WHERE createdAt >= ? ORDER BY createdAt ASC",[e]),[a]=await l.execute("SELECT id, title FROM Report WHERE createdAt >= ? AND uploaded_by_user_id IS NULL ORDER BY createdAt ASC",[e]),i=[];try{[i]=await l.execute("SELECT id, name FROM AlphanumericDashboard WHERE createdAt >= ? ORDER BY createdAt ASC",[e])}catch{i=[]}return[...t.map(e=>({tipo:"dataset",titulo:e.title,url:`/dataset/${e.id}`})),...a.map(e=>({tipo:"relatorio",titulo:e.title,url:`/relatorios/${e.id}`})),...i.map(e=>({tipo:"dashboard",titulo:e.name,url:"/dashboards-alfanumericos"}))]}},68605:(e,t,a)=>{a.d(t,{GI:()=>c,R:()=>n,bG:()=>s,hb:()=>T,vV:()=>E});var i=a(57435);let r=new Map;function s(e,t){return"string"!=typeof e?"":e.trim().replace(/\s+/g," ").slice(0,t)}function n(e){return s(e,254).toLowerCase()}function E(e){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)}function c(e){return!!(!(e.length<12)&&/[A-Z]/.test(e)&&/[a-z]/.test(e)&&/\d/.test(e)&&/[^A-Za-z0-9]/.test(e))}let d=null;async function o(){let e=process.env.REDIS_URL?.trim();return e?(d||(d=(async()=>{try{let{Redis:t}=await a.e(2197).then(a.t.bind(a,62197,23)),r=new t(e,{lazyConnect:!0,maxRetriesPerRequest:1,connectTimeout:3e3,retryStrategy:()=>null});return r.on("error",e=>i.k.error("ratelimit.redis.connection_error",{error:e})),await Promise.race([r.connect(),new Promise((e,t)=>setTimeout(()=>t(Error("redis connect timeout")),3e3))]),i.k.info("ratelimit.redis.connected"),r}catch(e){return i.k.error("ratelimit.redis.connect_failed",{error:e}),null}})()),d):null}async function u(e,t,a,i){let r=`ratelimit:${t}`,s=await e.incr(r);if(1===s&&await e.pexpire(r,i),s>a){let t=await e.pttl(r);return{allowed:!1,retryAfter:Math.max(1,Math.ceil((t>0?t:i)/1e3))}}return{allowed:!0,retryAfter:0}}async function T(e,t,a){let s=await o();if(s)try{return await u(s,e,t,a)}catch(e){i.k.error("ratelimit.redis.query_failed",{error:e})}return function(e,t,a){let i=Date.now(),s=r.get(e);return!s||i>s.resetAt?(r.set(e,{count:1,resetAt:i+a}),{allowed:!0,retryAfter:0}):s.count>=t?{allowed:!1,retryAfter:Math.max(1,Math.ceil((s.resetAt-i)/1e3))}:(s.count+=1,r.set(e,s),{allowed:!0,retryAfter:0})}(e,t,a)}}};