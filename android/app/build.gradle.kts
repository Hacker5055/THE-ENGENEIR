plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

/**
 * The APK is a native shell for the hosted platform.
 * Point it at your deployment without touching the code:
 *
 *   gradle -p android assembleDebug -PAM_APP_URL="https://your-domain.example"
 *
 * The value becomes the default in the in-app "server address" screen, so the
 * user can still change it on the device afterwards.
 */
val appUrl: String = (project.findProperty("AM_APP_URL") as String?) ?: "https://almohandes.edu"

android {
    namespace = "edu.almohandes.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "edu.almohandes.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "DEFAULT_APP_URL", "\"$appUrl\"")
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
    }

    // Signed builds: pass -PAM_KEYSTORE=... (and friends) — the CI workflow does
    // this from repository secrets. Without them the release build is debug-signed.
    val keystorePath = project.findProperty("PAM_KEYSTORE") as String?
    signingConfigs {
        if (keystorePath != null) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = project.findProperty("PAM_KEYSTORE_PASSWORD") as String?
                keyAlias = project.findProperty("PAM_KEY_ALIAS") as String?
                keyPassword = project.findProperty("PAM_KEY_PASSWORD") as String?
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = if (keystorePath != null) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
}
