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
    fail("Native WebView condition failed: "+expression);
  }
  private void click(ActivityScenario<MainActivity> scenario,String label) throws Exception {
    js(scenario,"Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='"+label+"')?.click()");
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
      js(scenario,"localStorage.clear();location.reload()");
      waitFor(scenario,"!!document.querySelector('.location-gate')");
      scenario.onActivity(activity->activity.getOnBackPressedDispatcher().onBackPressed());
      waitFor(scenario,"!document.querySelector('.location-gate')");
      click(scenario,"Jobs");
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
      assertEquals("false",js(scenario,"Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Create account').disabled"));
    }
  }
}
