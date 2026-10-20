package uk.histreets.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.SystemClock;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class NativeShellTest {
  private String js(ActivityScenario<MainActivity> scenario, String expression) throws Exception {
    CountDownLatch latch=new CountDownLatch(1);
    AtomicReference<String> result=new AtomicReference<>();
    scenario.onActivity(activity->activity.getBridge().getWebView().evaluateJavascript(expression,value->{ result.set(value); latch.countDown(); }));
    assertTrue("JavaScript callback timed out",latch.await(10,TimeUnit.SECONDS));
    return result.get();
  }
  private void waitFor(ActivityScenario<MainActivity> scenario,String expression) throws Exception {
    long end=SystemClock.elapsedRealtime()+30000;
    while(SystemClock.elapsedRealtime()<end){ if("true".equals(js(scenario,expression)))return; SystemClock.sleep(200); }
    fail("Native WebView condition failed: "+expression+"; state="+js(scenario,"JSON.stringify({path:location.pathname,text:document.body.innerText.slice(0,2500)})"));
  }
  private void click(ActivityScenario<MainActivity> scenario,String label) throws Exception {
    js(scenario,"Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='"+label+"')?.click()");
  }
  @Test public void installedAppReachesLiveBackendAndRejectsPrivateAccess() throws Exception {
    JSONObject config;
    try(java.io.InputStream stream=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("live-backend-public.json")){
      config=new JSONObject(new String(stream.readAllBytes(),StandardCharsets.UTF_8));
    }
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      waitFor(scenario,"!!document.querySelector('.bottom-tabs')");
      String script="(async()=>{try{const c="+config.toString()+";const h={apikey:c.publishableKey,'Content-Type':'application/json'};const m=await(await fetch('/mobile-build.json')).json();if(!m.configured||m.preview)throw Error('Incorrect native build configuration');const listings=await fetch(c.url+'/rest/v1/rpc/businesses_geojson',{method:'POST',headers:h,body:'{}'});const collection=await listings.json();if(listings.status!==200||collection.type!=='FeatureCollection'||!Array.isArray(collection.features)||collection.features.length===0)throw Error('Public map listing request failed: '+listings.status);const reports=await fetch(c.url+'/rest/v1/content_reports?select=id&limit=1',{headers:h});if(![401,403].includes(reports.status))throw Error('Private reports were not denied: '+reports.status);const invalid=await fetch(c.url+'/rest/v1/rpc/submit_content_report',{method:'POST',headers:h,body:JSON.stringify({p_kind:'invalid-native-test',p_target_id:null,p_reason:'other',p_details:'',p_snapshot:''})});if(invalid.status!==400)throw Error('Invalid report was not rejected: '+invalid.status);const auth=await fetch(c.url+'/auth/v1/settings',{headers:h});if(auth.status!==200)throw Error('Auth settings unavailable: '+auth.status);window.__nativeBackendResult='passed';}catch(e){window.__nativeBackendResult='failed: '+e.message}})()";
      js(scenario,script);
      waitFor(scenario,"typeof window.__nativeBackendResult==='string'");
      assertEquals("\"passed\"",js(scenario,"window.__nativeBackendResult"));
    }
  }
  @Test public void packagedAppUsesNativeBridgeAndOptionalLocation() throws Exception {
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      waitFor(scenario,"!!document.querySelector('.bottom-tabs')");
      assertEquals("\"https://localhost\"",js(scenario,"location.origin"));
      assertEquals("true",js(scenario,"window.Capacitor.isNativePlatform()"));
      assertEquals(PackageManager.PERMISSION_DENIED,InstrumentationRegistry.getInstrumentation().getTargetContext().checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION));
      assertEquals("false",js(scenario,"Array.from(document.scripts).some(s=>s.src.includes('googletagmanager'))"));
    }
  }
  @Test public void androidBackClosesPromptThenReturnsToMap() throws Exception {
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      waitFor(scenario,"!!document.querySelector('.bottom-tabs')");
      js(scenario,"localStorage.clear();window.__nativeTestReloadPending=true;location.reload()");
      waitFor(scenario,"window.__nativeTestReloadPending!==true && document.readyState==='complete' && !!document.querySelector('.location-gate')");
      scenario.onActivity(activity->activity.getOnBackPressedDispatcher().onBackPressed());
      waitFor(scenario,"!document.querySelector('.location-gate')");
      js(scenario,"document.querySelector('.bottom-tabs button[aria-label=\"Jobs\"]').click()");
      waitFor(scenario,"location.pathname==='/jobs' && document.body.textContent.includes('Jobs in Newham')");
      scenario.onActivity(activity->activity.getOnBackPressedDispatcher().onBackPressed());
      waitFor(scenario,"location.pathname==='/map'");
    }
  }
  @Test public void accountDeletionAndSignupRulesAreAvailable() throws Exception {
    try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
      waitFor(scenario,"!!document.querySelector('.bottom-tabs')");
      click(scenario,"Use Newham map for now");
      click(scenario,"Business");
      waitFor(scenario,"document.body.textContent.includes('Sign in to HiStreets')");
      assertEquals("true",js(scenario,"!!document.querySelector('a[href=\"/delete-account.html\"]')"));
      click(scenario,"Create account");
      waitFor(scenario,"!!document.querySelector('.safety-consent input')");
      assertEquals("true",js(scenario,"Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Create account').disabled"));
      js(scenario,"document.querySelector('.safety-consent input').click()");
      waitFor(scenario,"!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Create account').disabled");
    }
  }
}
