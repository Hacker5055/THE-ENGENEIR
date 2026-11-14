package edu.almohandes.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import edu.almohandes.app.databinding.ActivityMainBinding

/**
 * Native shell for the AL MOHANDES platform.
 *
 * The product itself is server-rendered (Next.js) — login, the exam engine and
 * every report live on the server. This app wraps that surface in a hardened
 * WebView so students get an installable icon, a real first-party cookie jar
 * (no third-party cookie blocking), pull-to-refresh, back navigation and
 * geolocation for attendance check-in.
 *
 * The server address is editable on the device, so one APK can point at a
 * demo, a staging or a production deployment without rebuilding.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var pendingGeoOrigin: String? = null
    private var pendingGeoCallback: GeolocationPermissions.Callback? = null
    private var pendingPermissionRequest: PermissionRequest? = null
    private var fileCallback: android.webkit.ValueCallback<Array<Uri>>? = null

    private val prefs by lazy { getSharedPreferences("almohandes", Context.MODE_PRIVATE) }
    private val baseUrl: String
        get() = prefs.getString("server_url", BuildConfig.DEFAULT_APP_URL)?.trimEnd('/')
            ?: BuildConfig.DEFAULT_APP_URL

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
            pendingPermissionRequest?.let { request ->
                val allowed = request.resources.filter { res ->
                    when (res) {
                        PermissionRequest.RESOURCE_VIDEO_CAPTURE -> granted[Manifest.permission.CAMERA] == true
                        PermissionRequest.RESOURCE_AUDIO_CAPTURE -> granted[Manifest.permission.RECORD_AUDIO] == true
                        else -> false
                    }
                }
                if (allowed.isNotEmpty()) request.grant(allowed.toTypedArray()) else request.deny()
                pendingPermissionRequest = null
            }
            pendingGeoCallback?.let { callback ->
                val fine = granted[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                    ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                callback.invoke(pendingGeoOrigin, fine, false)
                pendingGeoCallback = null
                pendingGeoOrigin = null
            }
        }

    private val filePickerLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            fileCallback?.onReceiveValue(uris)
            fileCallback = null
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        with(binding.webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadsImagesAutomatically = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            setSupportZoom(false)
            builtInZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
        }
        binding.webView.setBackgroundColor(ContextCompat.getColor(this, R.color.brand_navy))

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(binding.webView, true)
        }

        binding.swipe.setOnRefreshListener { binding.webView.reload() }
        binding.retryButton.setOnClickListener {
            binding.errorPanel.isVisible = false
            binding.webView.reload()
        }
        binding.changeServerButton.setOnClickListener { askForServer() }

        binding.webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                val sameHost = url.host?.equals(Uri.parse(baseUrl).host, ignoreCase = true) == true
                return if (sameHost) {
                    false
                } else {
                    openExternally(url)
                    true
                }
            }

            override fun onPageFinished(view: WebView, url: String) {
                binding.splash.isVisible = false
                binding.swipe.isRefreshing = false
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) {
                    binding.splash.isVisible = false
                    binding.swipe.isRefreshing = false
                    binding.errorHost.text = Uri.parse(baseUrl).host ?: baseUrl
                    binding.errorPanel.isVisible = true
                }
            }
        }

        binding.webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                pendingPermissionRequest = request
                val wanted = mutableListOf<String>()
                if (request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                    wanted.add(Manifest.permission.CAMERA)
                }
                val missing = wanted.filter {
                    ContextCompat.checkSelfPermission(this@MainActivity, it) != PackageManager.PERMISSION_GRANTED
                }
                if (missing.isEmpty()) {
                    request.grant(request.resources)
                    pendingPermissionRequest = null
                } else {
                    permissionLauncher.launch(missing.toTypedArray())
                }
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: GeolocationPermissions.Callback,
            ) {
                val fine = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.ACCESS_FINE_LOCATION,
                ) == PackageManager.PERMISSION_GRANTED
                if (fine) {
                    callback.invoke(origin, true, false)
                } else {
                    pendingGeoOrigin = origin
                    pendingGeoCallback = callback
                    permissionLauncher.launch(
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION,
                        ),
                    )
                }
            }

            override fun onShowFileChooser(
                webView: WebView,
                callback: android.webkit.ValueCallback<Array<Uri>>,
                params: WebChromeClient.FileChooserParams,
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try {
                    filePickerLauncher.launch(params.createIntent())
                    true
                } catch (error: ActivityNotFoundException) {
                    fileCallback = null
                    false
                }
            }
        }

        binding.webView.setDownloadListener { url, _, _, mime, _ ->
            try {
                if (mime.startsWith("image") || url.startsWith("data:")) {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                } else {
                    val request = DownloadManager.Request(Uri.parse(url))
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                    manager.enqueue(request)
                    toast(getString(R.string.download_started))
                }
            } catch (error: Exception) {
                openExternally(Uri.parse(url))
            }
        }

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (binding.webView.canGoBack()) binding.webView.goBack() else finish()
                }
            },
        )

        if (!prefs.contains("server_url")) {
            askForServer(firstRun = true)
        } else {
            load()
        }
    }

    private fun load() {
        binding.errorPanel.isVisible = false
        binding.splash.isVisible = true
        val target = prefs.getString("start_path", "/login") ?: "/login"
        binding.webView.loadUrl("$baseUrl$target")
    }

    private fun askForServer(firstRun: Boolean = false) {
        val input = EditText(this).apply {
            setText(baseUrl)
            setHint(R.string.server_hint)
            setSingleLine()
            setPadding(48, 32, 48, 32)
        }
        val dialog = AlertDialog.Builder(this)
            .setTitle(R.string.server_title)
            .setMessage(R.string.server_message)
            .setView(input)
            .setPositiveButton(R.string.server_save) { _, _ ->
                val raw = input.text.toString().trim()
                val normalized = when {
                    raw.isEmpty() -> BuildConfig.DEFAULT_APP_URL
                    raw.startsWith("http://") || raw.startsWith("https://") -> raw
                    else -> "https://$raw"
                }
                prefs.edit().putString("server_url", normalized.trimEnd('/')).apply()
                load()
            }
            .setNegativeButton(R.string.cancel) { _, _ ->
                if (firstRun) {
                    prefs.edit().putString("server_url", BuildConfig.DEFAULT_APP_URL).apply()
                    load()
                }
            }
            .create()

        dialog.setCancelable(!firstRun)
        dialog.show()
    }

    private fun openExternally(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (error: ActivityNotFoundException) {
            toast(getString(R.string.no_app_for_link))
        }
    }

    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_SHORT).show()

    override fun onPause() {
        binding.webView.onPause()
        CookieManager.getInstance().flush()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        binding.webView.onResume()
    }

    override fun onDestroy() {
        binding.webView.destroy()
        super.onDestroy()
    }
}
