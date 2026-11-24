const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('app.js','utf8');
const memory = new Map();
const elements = { app: { innerHTML:'' }, toast: {className:'',textContent:''} };
const context = {
  console, structuredClone, URL, Blob, Date, Math, JSON, String, Number, Object, Array,
  location:{hash:'#home',href:'http://localhost/#home'},
  localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},
  sessionStorage:{value:null,getItem(){return this.value},setItem(k,v){this.value=v},removeItem(){this.value=null}},
  window:{addEventListener(){},scrollTo(){}},
  document:{addEventListener(){},getElementById:id=>elements[id]||null,querySelector(s){return s==='.modal-backdrop'?{remove(){}}:null},querySelectorAll(){return []},createElement(){return {click(){},set href(v){},set download(v){}}},body:{appendChild(){}}},
  setTimeout:()=>1,clearTimeout(){},FormData:class{constructor(obj={}){this.obj=obj}get(k){return typeof this.obj.get==='function'?this.obj.get(k):(this.obj[k]??'')}},
};
vm.createContext(context);
vm.runInContext(source+`\n;globalThis.testApi={db,save,render,jobCard,courseCard,scoreJob,applyJob,enroll,applyApprentice,saveJob,saveCourse,setApplicationStatus,updateEnrollment,districtStats,skillDemand,register,approveUser,allApplications,allEnrollments,adminDash,seekerDash,employerDash,centreDash};`,context);
const a=context.testApi;
assert.equal(a.db.jobs.length,10);
assert.equal(a.db.courses.length,10);
assert.equal(a.db.employers.length,5);
assert.equal(a.db.centres.length,5);
const seeker=a.db.users.find(x=>x.role==='seeker');
const score=a.scoreJob(a.db.jobs[0],seeker);
assert(score>=60&&score<=100,`expected a strong prototype match, got ${score}`);
context.sessionStorage.setItem('ks.user',seeker.email);
a.applyJob('J101');
assert.equal(seeker.applications.length,1);
assert.equal(seeker.applications[0].status,'Applied');
a.enroll('C201');
assert.equal(seeker.enrollments.length,1);
assert.equal(a.db.courses[0].seats,17);
a.applyApprentice('A301');
assert.equal(seeker.apprenticeApps.length,1);
const emp=a.db.users.find(x=>x.role==='employer');
context.sessionStorage.setItem('ks.user',emp.email);
a.saveJob({get:k=>({title:'QA Demo',district:'Kolar',category:'IT & Data',salary:'₹3 LPA',experience:'Fresher',education:'Any degree',skills:'Testing, Python',description:'Demo job'})[k]||''},'');
assert.equal(a.db.jobsPosted.length,1);
assert.equal(a.db.jobsPosted[0].company,'Mysuru Digital Labs');
const centre=a.db.users.find(x=>x.role==='centre');
context.sessionStorage.setItem('ks.user',centre.email);
a.saveCourse({get:k=>({name:'Local QA course',duration:'4 weeks',eligibility:'PUC',skills:'Testing, QA',fees:'₹0',mode:'Hybrid',seats:'12',district:'Kolar',accreditation:'Demo'})[k]||''},'');
assert.equal(a.db.coursesPublished.length,1);
const beforeUsers=a.db.users.length;
a.register({get:k=>({name:'QA Candidate',email:'qa-candidate@demo.in',password:'StrongDemo123',role:'seeker',district:'Kolar',phone:'9876500000'})[k]||''});
assert.equal(a.db.users.length,beforeUsers+1);
assert.equal(a.db.users.at(-1).email,'qa-candidate@demo.in');
const admin=a.db.users.find(x=>x.role==='admin');
context.sessionStorage.setItem('ks.user',admin.email);
a.approveUser('qa-candidate@demo.in');
assert.equal(a.db.users.at(-1).verified,true);
assert.equal(a.districtStats().length,5);
assert(a.skillDemand().length>0);
for (const [role,fn] of [['seeker',a.seekerDash],['employer',a.employerDash],['centre',a.centreDash],['admin',a.adminDash]]) {
  const user=a.db.users.find(x=>x.role===role);
  const html=fn(user);
  assert(html.includes('dashboard')||html.includes('overview'),`${role} dashboard should render`);
}
const persisted=JSON.parse(memory.get('kaushalsetu.v1'));
assert.equal(persisted.jobsPosted.length,1);
assert.equal(persisted.coursesPublished.length,1);
console.log(JSON.stringify({jobs:a.db.jobs.length,courses:a.db.courses.length,match:score,applications:seeker.applications.length,enrollments:seeker.enrollments.length,apprenticeshipApps:seeker.apprenticeApps.length,employerJobs:a.db.jobsPosted.length,centreCourses:a.db.coursesPublished.length,persisted:true,districts:a.districtStats().length},null,2));
