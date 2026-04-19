"""ローカル確認用の静的ファイル配信サーバー

本番は GitHub Pages 等の静的ホスティングを使うため Flask は不要。
このファイルはローカルでタブレットから PWA 登録する際の便宜用。
`python3 -m http.server 8080` でも同等のことができる。
"""

from flask import Flask, send_from_directory

app = Flask(__name__, static_folder="static", static_url_path="/static")


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/sw.js")
def service_worker():
    response = send_from_directory(".", "sw.js")
    response.headers["Cache-Control"] = "no-cache"
    return response


@app.route("/manifest.webmanifest")
def manifest():
    return send_from_directory(".", "manifest.webmanifest")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
