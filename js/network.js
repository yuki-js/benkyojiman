const b64 = require("js-base64").Base64
let prefix="http://勉強.ga:40298/api"
if(localStorage.defaultServer){
  prefix=localStorage.defaultServer;
}
const cryptico =require("cryptico")

exports.fetchWrap=(url,option)=>window.fetch(prefix+url,option).then(res=>{
  if(!res.ok){
    throw new Error()
  }
  return res.json()
})

exports.encryptedFetch=(url,bodyJsObj,aesKey,myKey)=>{
  const encryptedBody = cryptico.encryptAESCBC(b64.encode(JSON.stringify(bodyJsObj)),aesKey)  
  return window.fetch(prefix+url,{
    method:"POST",
    body:encryptedBody,
    headers:new Headers({
      "X-Publickey":myKey,
      "Content-Type":"application/x-aes-encrypted"
    })
  }).then(res=>{
    if(!res.ok){
      throw new Error()
    }
    return res.text()
  }).then(cpr=>JSON.parse(b64.decode(cryptico.decryptAESCBC(cpr,aesKey))))
};