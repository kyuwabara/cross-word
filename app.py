"""クロスワードパズル Web アプリケーション"""

from flask import Flask, jsonify, render_template, request

from crossword import CrosswordGenerator
from words import WORDS

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/generate")
def generate():
    width = request.args.get("width", 8, type=int)
    height = request.args.get("height", 8, type=int)
    width = max(5, min(15, width))
    height = max(5, min(15, height))

    generator = CrosswordGenerator(width, height, WORDS)
    result = generator.generate()
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
