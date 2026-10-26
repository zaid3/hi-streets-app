import XCTest

final class AppUITests: XCTestCase {
    func testBundledAppNavigationAndSignIn() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30), "The bundled app must load in WKWebView.")

        let skipLocation = app.buttons["Use Newham map for now"]
        if skipLocation.waitForExistence(timeout: 10) { skipLocation.tap() }
        XCTAssertTrue(app.buttons["Map"].waitForExistence(timeout: 20))
        capture("01-map", app)

        for (tab, heading) in [("Offers", "Offers near you"), ("Jobs", "Jobs in Newham"), ("Community", "Find free meals and community support near you.")] {
            app.buttons[tab].tap()
            XCTAssertTrue(app.staticTexts[heading].waitForExistence(timeout: 15), "The \(tab) tab must load without signing in.")
            capture(tab.lowercased(), app)
        }

        app.buttons["Business"].tap()
        XCTAssertTrue(app.staticTexts["Sign in to HiStreets"].waitForExistence(timeout: 15))
        capture("05-business", app)
    }

    private func capture(_ name: String, _ app: XCUIApplication) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
