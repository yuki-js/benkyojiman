const cryptico = require("cryptico")
const b64 = require("js-base64").Base64
var customBar = {//for safari
  template:"#customBar",
  props:["pageStack","title"]
}
const network = require("./network")
let key, myPubKey,aesKey,name,school



const dataTransporter=[]
const Home = {
  template:"#home",
  props:["pageStack"],
  data(){
    return {
      isWV:false
    }
  },
  methods:{
    jiman(){
      this.pageStack.push(JimanForm)
    },
    backnumber(){
      this.pageStack.push(Backnumber)
    },
    addTest(){
      this.pageStack.push(AddTest)
    },
    register(){
      this.pageStack.push(Register)
    },
    goToAbout(){
      this.pageStack.push(About)
    }
  },
  components:{customBar},
  mounted(){
    window.addEventListener("load",()=>{
      this.isWV=this.$ons.platform.isWebView()
    })
    key=cryptico.RSAKey.parse(localStorage.rsa)
    myPubKey=cryptico.publicKeyString(key)
    aesKey=cryptico.generateAESKey()
    
    network.fetchWrap("/")
      .then(result=>result.pubKey)
      .then(pubKey=>network.fetchWrap("/user/login",{
        method:"POST",
        body:JSON.stringify(cryptico.encrypt(aesKey.map(v=>("0"+v.toString(16)).slice(-2)).join(""),pubKey,key)),
        headers:new Headers({
          "Content-Type": "application/json"
        }),
        mode:"cors"
      })).then((cph)=>{
        const jn=JSON.parse(b64.decode(cryptico.decryptAESCBC(cph.cipher,aesKey)))
        if(jn.success&&myPubKey==jn.pubKey){
          name=jn.name
          school=jn.school|0
          if(!name||!school){
            this.pageStack.push(Register)
            this.$ons.notification.alert("まず登録してください")
          }
        }
      })
  }
}
const JimanForm = {
  template:"#jimanForm",
  props:["pageStack"],
  data(){
    return {
      subjects:["科目を選択してください"],
      result:[],
      
      score:0,
      testName:"",
      subject:"",

      loading:false
    }
  },
  methods:{
    getTests(){
      network.fetchWrap("/test/"+school+"?now="+Date.now()).then((rows)=>{
        this.result=rows.map(v=>{ return {testName:v.testName,subjects:v.subjects.split(",")} })
        this.testName=this.result[0].testName
      })
    },
    submit(){
      this.loading=true

      network.encryptedFetch("/score",{
        score:this.score,
        testName:this.testName,
        subject:this.subject        
      },aesKey,myPubKey).then(d=>{
        if(d.success){
          this.loading=false
          this.pageStack.pop()
          this.$ons.notification.toast("登録しました",{timeout:2000})
        }
      })
    }
  },
  watch:{
    testName(){
      for(let i=0;i<this.result.length;i++){
        if(this.result[i].testName===this.testName){
          this.subjects=this.result[i].subjects;
          this.subject=this.subjects[0]
          break;
        }
      }
    }
  },
  components:{customBar},
  mounted(){
    this.getTests()
  }
}

const AddTest = {
  template:"#addTest",
  props:["pageStack"],
  data(){
    return {
      testName:"",
      subjects:[],
      deadline:"",

      addingSub:"",
      loading:false
    }
  },
  methods:{
    submit(){
      if(this.addingSub){
        this.$ons.notification.toast("追加ボタンを一回押してください。")
        return 
      }
      this.loading=true

      network.encryptedFetch("/test",{
        deadline:Date.now()+this.deadline*24*60*60*1000,
        testName:this.testName,
        subjects:this.subjects.join(",")        
      },aesKey,myPubKey).then(d=>{
        if(d.success){
          this.loading=false
          this.pageStack.pop()
          this.$ons.notification.toast("登録しました",{timeout:2000})
        }
      })
    },
    addSubject(){
      if(this.addingSub){
        this.subjects.push(this.addingSub)
      }
      this.addingSub=""
    },
    removeSub(i){
      this.subjects.splice(this.subjects.indexOf(i),1)
    }
  },
  components:{customBar},
  mounted(){
    
  }
}

const Backnumber= {
  template:"#backnumber",
  props:["pageStack"],
  data(){
    return {
      testList:[]
    }
  },
  methods:{
    getTestList(){
      network.fetchWrap("/test/"+school).then((rows)=>{
        this.testList=rows.map(v=>v.testName)
      })
    },
    goToDetail(id){
      dataTransporter.push(id)
      this.pageStack.push(Detail);
    }
  },
  components:{customBar},
  mounted(){
    this.getTestList()
  }
}

const Detail = {
  template:"#detail",
  props:["pageStack"],
  data(){
    return {
      testName:dataTransporter.pop(),
      result:[],
      filterByName:"",
      filterBySubject:"",
      devScore:0
    }
  },
  methods:{
    getData(orderby){
      
      network.fetchWrap(`/score/${school}/${this.testName}`).then((rows)=>{
        this.result=rows
      })
    },
    filter(item){
      if(!this.filterByName&&!this.filterBySubject){return true}
      if(!this.filterBySubject&&this.filterByName===item.name){return true}
      if(!this.filterByName&&this.filterBySubject===item.subject){return true}
      if(this.filterByName==item.name&&this.filterBySubject===item.subject){return true}
      return false
    }
  },
  computed:{
    analyzed(){
      let sum=0;
      let powSum=0;
      let count=0;
      const matched=[]
      for(let i=0;i<this.result.length;i++){
        if(this.filter(this.result[i])){
          count++;
          powSum+=this.result[i].score*this.result[i].score
          sum+=this.result[i].score
          matched.push(this.result[i].score)
        }
      }
      const average=sum/count
      const variance=powSum/count-average*average
      return {
        average,
        median:matched[(matched.length/2)|0],
        variance,
        deviation:Math.sqrt(variance)
      }
    },
    stdScore(){
      return 50+10*(this.devScore-this.analyzed.average)/this.analyzed.deviation
    }
  },
  components:{customBar},
  mounted(){
    this.getData()
  }
}
const First = {
  template:"#first",  props:["pageStack"],
  components:{customBar},
  methods:{
    goToGenKey(){
      this.pageStack.push(GenerateKey)
    },
    goToUseKey(){
      this.pageStack.push(UseKey)
    }
  }
}

// i used English words list instead of Japanese one because of surrogate pair
// 日本語で 保存するなり 秘密鍵 英語に変えさす サロゲートペア

function loadWordList() {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest
    xhr.onload = function() {
      resolve(JSON.parse(xhr.responseText))
    }
    xhr.onerror = function() {
      reject(new TypeError('request failed'))
    }
    xhr.open('GET', "dist/res/bip39en.json")
    xhr.send(null)
  })
}

function indexFromSortedList(sortedArray,value){
  let left=0
  let right=sortedArray.length-1

  while(left<=right){
    const center=(left+((right-left)/2)|0)
    const centerVal=sortedArray[center]
    if(centerVal===value){
      return center
    }else if(centerVal<value){
      left = center+1
    }else{
      right = center-1
    }
    
  }
  return null
}

function arrayToWords(array){
  return loadWordList().then((wordList)=>{
    const words = []
    for(let i=0;i<13;i++){
      words.push(wordList[array[i]]);
    }
    return words
  })
}
function wordsToArray(words){
  return loadWordList().then((wordList)=>{
    const array = []
    for(let i=0;i<13;i++){
      const ret = indexFromSortedList(wordList,words[i])
      if(ret){
        array.push(ret)
      }else{
        return null
      }
    }
    return array;
  })

}

const NoteKey = {
  template:"#noteKey",  props:["pageStack"],
  components:{customBar},
  data(){
    return {
      rsaData:dataTransporter.pop(),
      words:[],
      wordsToShow:""
    }
  },
  methods:{
    done(){
      localStorage.seed=this.rsaData.key.join(",")
      localStorage.rsa=JSON.stringify(this.rsaData.rsa.toJSON())
      localStorage.publicKey=this.rsaData.pubKey
      this.pageStack.push(Home)
    }
  },
  mounted(){
    arrayToWords(this.rsaData.key).then((words)=>{
      this.wordsToShow=words.join(" ")
    })
  }
}
const GenerateKey = {
  template:"#generateKey",  props:["pageStack"],
  components:{customBar},
  data(){
    return {
      cnt:0,
      next:false,
      keyArray:[],
      sensorAvailable:false
    }
  },
  methods:{
    complete(){
      if(!this.next){
        this.next=true;
        const rsaKey=cryptico.generateRSAKey(this.keyArray.join(","),512)
        dataTransporter.push({
          rsa:rsaKey,
          key:this.keyArray,
          pubKey:cryptico.publicKeyString(rsaKey)
        })
        this.pageStack.push(NoteKey)
      }
    }
  },
  mounted(){//2048 is the number of words in BIP39 word list.13 is word count.
    let detecting = true;
    let drag=false;
    let arr=[];
    const gd = this.$ons.GestureDetector(this.$refs.touchArea)
    gd.on("dragstart",(e)=>{
      if(!detecting){return}
      drag=true;
    })
    gd.on("drag",(e)=>{
      if(!detecting){return}
      if(((Math.random()*19)|0)==4){
        const a=((e.gesture.interimAngle*e.gesture.deltaX*e.gesture.deltaY)|0)%2048;
        if(a){
          arr.push(a>0?a:-a)
        }
      }
    });
    gd.on("dragend",(e)=>{
      if(!detecting){return}
      drag=false;
      if(arr.length){
        let sum=16;
        for(let i=arr.length-1;i>=0;i--){
          sum+=arr[i];
        }
        this.keyArray.push(sum%2048);
        if(++this.cnt>=13){
          detecting = false
          setInterval(()=>{this.complete()},300);
        }
      }
      arr=[];
    })
    window.addEventListener("devicemotion",(e)=>{
      if(!detecting){return}
      if(e.rotationRate.alpha){
        this.sensorAvailable=true
      }

      if(7==((Math.random()*21)|0)){
        let a=((e.acceleration.x+e.acceleration.y+e.rotationRate.alpha+e.rotationRate.beta+e.rotationRate.gamma)*810893)|0;
        a=a>0?a:-a
        if(a>30){
          this.keyArray.push(a%2048)
          if(++this.cnt>=13){
            detecting = false
            setInterval(()=>{this.complete()},300);
          }
        }
      }
    }, true);
  }
}
const UseKey = {
  template:"#useKey",  props:["pageStack"],
  components:{customBar},
  data(){
    return {
      words:"",
      again:false
    }
  },
  methods:{
    next(){
      wordsToArray(this.words.split(" ")).then((arr)=>{
        if(!arr){
          this.again=true
          return
        }
        
        const j =arr.join(",")
        const k=cryptico.generateRSAKey(j,512)
        localStorage.seed=j
        localStorage.rsa=JSON.stringify(k)
        localStorage.publicKey=cryptico.publicKeyString(k)

        this.pageStack.push(Home)
      })
    }
  }
}


const Register = {
  template:"#register",
  props:["pageStack"],
  data(){
    return {
      name:"",
      school:""
    }
  },
  methods:{
    register(){
      if(!this.name||!this.school){
        return this.$ons.notification.toast("入力してください",{timeout:2000})
      }
      network.encryptedFetch("/user/register/",{
        name:this.name,
        school:this.school
      },aesKey,myPubKey).then(d=>{
        if(d.success){
          school=this.school
          name = this.name
          this.pageStack.pop()
          this.$ons.notification.toast("登録しました",{timeout:2000})
        }
      })
    }
  },
  components:{customBar},
  mounted(){
    
  }
}
const About ={
  template:"#about",
  props:["pageStack"],
  components:{customBar},
}

Vue.use(VueOnsen)
new Vue({
  el:"#app",
  data(){
    if(localStorage.rsa){
      return {
        pageStack:[Home]
      }
    }else{
      return {
        pageStack:[First]
      }
    }
  },
  template:"#nav",
  beforeCreate(){
    //this.$ons.platform.select("ios");
    //this.$ons.disableAnimations();
    this.$ons.enableAutoStatusBarFill()
  },
  mounted(){
      
  }
})
window.addEventListener('load', function() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('dist/res/serviceWorker.js');
  }
});
