const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');

const base=(process.env.TEST_API_BASE_URL||'').replace(/\/$/,'');
const enabled=!!base;
async function call(path,{method='GET',cookie,body,headers={}}={}){const h={...headers};if(cookie)h.cookie=cookie;if(body!==undefined)h['content-type']='application/json';const r=await fetch(base+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});let data={};try{data=await r.json()}catch{}return {r,data,cookie:r.headers.get('set-cookie')?.split(';')[0]}}
async function signIn(email){const x=await call('/api/auth/login',{method:'POST',body:{email,password:'Demo@123'}});assert.equal(x.r.status,200,`login for ${email}: ${JSON.stringify(x.data)}`);return x.cookie}
async function uploadPdf(cookie,bytes){const form=new FormData();form.append('resume',new Blob([bytes],{type:'application/pdf'}),'test-resume.pdf');return fetch(base+'/api/resumes',{method:'POST',headers:{cookie},body:form})}

test('KaushalSetu API role and persistence integration', {skip:!enabled&&'Set TEST_API_BASE_URL to a seeded local integration-test server'}, async t=>{
 const status=await call('/api/status');assert.equal(status.r.status,200);assert.equal(status.data.database,'connected');
 const anonymous=await call('/api/portal/bootstrap');assert.equal(anonymous.r.status,401);
 const registration=await call('/api/auth/register',{method:'POST',body:{name:'Integration Candidate',email:`integration-${crypto.randomBytes(4).toString('hex')}@example.test`,password:'Integration-Test-1234!',role:'seeker',district:'Kolar'}});assert.equal(registration.r.status,201);assert.equal(registration.data.user.role,'seeker');assert.equal('password_hash' in registration.data.user,false);
 const seeker=await signIn('seeker@demo.in'),employer=await signIn('employer@demo.in'),centre=await signIn('centre@demo.in'),admin=await signIn('admin@demo.in');
 const uploaded=await uploadPdf(seeker,'%PDF-1.4\nKaushalSetu test fixture');assert.equal(uploaded.status,201);
 const invalidUpload=await uploadPdf(seeker,'not a PDF');assert.equal(invalidUpload.status,400);
 const denied=await call('/api/portal/sync',{method:'POST',cookie:seeker,body:{jobs:[]}});assert.equal(denied.r.status,403);
 const analyticsDenied=await call('/api/admin/analytics',{cookie:seeker});assert.equal(analyticsDenied.r.status,403);
 const analyticsAllowed=await call('/api/admin/analytics',{cookie:admin});assert.equal(analyticsAllowed.r.status,200);
 const publicData=await call('/api/public/bootstrap');assert.equal(publicData.r.status,200);assert.ok(publicData.data.jobs.length>=10);assert.ok(publicData.data.courses.length>=10);
 const token=crypto.randomBytes(4).toString('hex'),jobId=`IT-${token}`;
 const postJob=await call('/api/portal/sync',{method:'POST',cookie:employer,body:{jobs:[{id:jobId,title:'Integration test role',district:'Kolar',category:'IT & Data',salary:'₹3 LPA',experience:'Fresher',education:'Any degree',skills:['Testing'],description:'Integration test vacancy'}]}});assert.equal(postJob.r.status,200);
 const pendingJob=await call('/api/portal/bootstrap',{cookie:employer});assert.ok(pendingJob.data.jobsPosted.some(x=>x.id===jobId));
 const reviewJob=await call('/api/admin/listings/review',{method:'POST',cookie:admin,body:{type:'job',id:jobId,decision:'published'}});assert.equal(reviewJob.r.status,200);
 const apply=await call('/api/portal/sync',{method:'POST',cookie:seeker,body:{applications:[{jobId}]}});assert.equal(apply.r.status,200);
 const seekerData=await call('/api/portal/bootstrap',{cookie:seeker});assert.ok(seekerData.data.currentUser.applications.some(x=>x.jobId===jobId));
 const resume=await fetch(base+`/api/employer/candidates/${seekerData.data.currentUser.id}/resume`,{headers:{cookie:employer}});assert.equal(resume.status,200);
 const centerId=`IT-C-${token}`;
 const publishCourse=await call('/api/portal/sync',{method:'POST',cookie:centre,body:{courses:[{id:centerId,name:'Integration test course',district:'Kolar',duration:'4 weeks',eligibility:'PUC',skills:['Testing'],fees:'₹0',mode:'Online',seats:5,accreditation:'Test only'}]}});assert.equal(publishCourse.r.status,200);
 const reviewCourse=await call('/api/admin/listings/review',{method:'POST',cookie:admin,body:{type:'course',id:centerId,decision:'published'}});assert.equal(reviewCourse.r.status,200);
 const enroll=await call('/api/portal/sync',{method:'POST',cookie:seeker,body:{enrollments:[{courseId:centerId}]}});assert.equal(enroll.r.status,200);
 const afterReload=await call('/api/portal/bootstrap',{cookie:seeker});assert.ok(afterReload.data.currentUser.enrollments.some(x=>x.courseId===centerId));
 const logout=await call('/api/auth/logout',{method:'POST',cookie:seeker});assert.equal(logout.r.status,200);
 const expired=await call('/api/portal/bootstrap',{cookie:seeker});assert.equal(expired.r.status,401);
});
