// 教材データ。本文は HTML、コードは文字列。
// クイズは選択式（options/answer）と入力式（type:"input"/answers）の2種類。
// 各レッスンは選択式6問 + 入力式2問。入力式はスマホで打ちやすい短い答えにしている。

// ---- レベルチェック（最初のアンケート/クイズ） ----
window.PLACEMENT = [
  { q: "Console.WriteLine(\"Hi\"); は何をする？", options: ["Hi と表示する", "Hi をファイルに保存する", "Hi を消す", "エラーになる"], answer: 0 },
  { q: "整数（例: 42）を入れるのに使う型は？", options: ["int", "string", "bool", "char"], answer: 0 },
  { q: "C# のコードが実行されるまでに起きることは？", options: ["コンパイルされてから実行される", "1行ずつそのまま解釈される", "HTML に変換される", "自動で C++ になる"], answer: 0, explain: "C# はコンパイル言語。.NET が扱える形に変換されてから実行されます。" },
  { q: "この結果は？", code: "Console.WriteLine(7 / 2);", options: ["3", "3.5", "4", "エラーになる"], answer: 0 },
  { q: "型を書く（静的型付け）ことの利点は？", options: ["間違いを実行前に見つけやすい", "実行が必ず速くなる", "型を書かなくてよくなる", "コードが必ず短くなる"], answer: 0, explain: "「この箱には数値しか入らない」と決めておけるので、間違いを早く見つけられます。" },
  { q: "この表示は？", code: "for (int i = 0; i < 3; i++)\n    Console.WriteLine(i);", options: ["0 1 2", "1 2 3", "0 1 2 3", "3 2 1"], answer: 0 },
  { q: "クラスとオブジェクトの関係として正しいのは？", options: ["クラスは設計図、オブジェクトはそれから作った実体", "クラスは実体、オブジェクトは設計図", "どちらも同じもの", "クラスは変数の別名"], answer: 0, explain: "設計図（クラス）から new で実体（オブジェクト）を作ります。" },
  { q: "「継承」とは？", options: ["既存のクラスの性質を引き継いで新しいクラスを作る", "同じ処理をコピーする", "変数を共有する", "オブジェクトを削除する"], answer: 0, explain: "共通部分を親クラスにまとめ、子クラスが引き継ぎます。" },
  { q: "private やカプセル化の目的は？", options: ["外から勝手に触られないようにする", "実行を速くする", "メモリを減らす", "名前を短くする"], answer: 0 },
  { q: "new で作ったオブジェクトのメモリを自動で片付ける仕組みは？", options: ["ガベージコレクション", "コンパイル", "リファクタリング", "インタプリタ"], answer: 0 }
];

window.LEVELS = [
  { id: "beginner", badge: "Lv.1", name: "はじめて", start: "intro",  desc: "C# は初めて。基礎からゆっくり進めましょう。" },
  { id: "basic",    badge: "Lv.2", name: "基礎",     start: "if",     desc: "基本は知っている。制御や考え方の部分から始めましょう。" },
  { id: "advanced", badge: "Lv.3", name: "経験者",   start: "classes", desc: "基本はOK。オブジェクト指向から始めましょう。" }
];

window.LESSONS = [
  {
    id: "intro",
    section: "はじめの一歩",
    title: "C# ってなに？",
    body: `
      <p>C#（シーシャープ）は Microsoft が作った<strong>静的型付け</strong>のオブジェクト指向言語です。読み方は「シーシャープ」。Java や C++ の良いところを取り入れて設計されました。</p>
      <p>書いたコードはそのまま動くのではなく、いったん<strong>コンパイル</strong>という作業で実行できる形に変換されてから動きます。この「変換してから動かす」方式のおかげで、間違いを実行前に見つけやすくなっています。</p>
      <ul>
        <li><strong>.NET</strong> という実行環境の上で動く（Windows / macOS / Linux / ブラウザでも）</li>
        <li>ゲーム（Unity）・Web（ASP.NET）・業務システム・デスクトップアプリまで幅広い</li>
        <li>型が決まっているので、エディタが補完や警告を出してくれる</li>
      </ul>
      <p class="note">この教材は「読む → 予想する → 答える」の順で進みます。説明を読んでからクイズに挑戦してください。</p>`,
    code: `// これが C# のコード
Console.WriteLine("Hello, C#!");`,
    questions: [
      { q: "C# のコードは、実行される前にどうなる？", options: ["そのまま1行ずつ実行される", "コンパイルされて機械が扱える形になる", "HTML に変換される", "自動で Python になる"], answer: 1, explain: "C# はコンパイル言語。書いたコードは .NET が扱える形に変換されてから実行されます。" },
      { q: ".NET とは？", options: ["C# を動かす実行環境", "C# の別名", "OS の名前", "エディタの名前"], answer: 0, explain: "C# のコードは .NET という実行環境の上で動きます。" },
      { q: "C# は主にどの会社が開発した？", options: ["Microsoft", "Google", "Apple", "Amazon"], answer: 0 },
      { q: "C# のソースファイルの拡張子は？", options: [".cs", ".c#", ".csx", ".sharp"], answer: 0 },
      { q: "C# が使われている例として近いのは？", options: ["Unity のゲーム開発", "HTML のタグ", "Photoshop のフィルタ専用", "Excel の数式"], answer: 0 },
      { q: "C# はどんな開発に向いている？", options: ["ゲーム・Web・業務システムなど幅広く", "Webページの見た目だけ", "表計算だけ", "画像編集だけ"], answer: 0 },
      { type: "input", q: "C# のソースファイルの拡張子を入力してください（ドットも含めて）", answers: [".cs", "cs"], explain: "C# のファイルは .cs です。" },
      { type: "input", q: "C# を開発した会社名を英字で入力してください", answers: ["microsoft", "マイクロソフト"], explain: "Microsoft（マイクロソフト）が作りました。" }
    ]
  },

  {
    id: "hello",
    section: "はじめの一歩",
    title: "最初のプログラム",
    body: `
      <p>プログラムは <code>Main</code> メソッドから始まります。上の行から順に実行され、<code>Console.WriteLine</code> は「1行表示して改行」します。</p>
      <p>コードの区切りには <code>;</code>（セミコロン）を付けます。処理のまとまりは <code>{ }</code>（波かっこ）で囲みます。最初はこの2つの記号の役割だけ覚えておけば十分です。</p>
      <ul>
        <li><code>Console.WriteLine(値)</code> … 表示して改行</li>
        <li><code>Console.Write(値)</code> … 表示するだけ（改行しない）</li>
        <li><code>using System;</code> … <code>Console</code> などを使えるようにする</li>
      </ul>`,
    code: `using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("Hello, C#!");
        Console.WriteLine(1 + 2);
    }
}`,
    questions: [
      { q: "このプログラムを実行すると、どう表示される？", options: ["Hello, C#! と 3 が2行で出る", "Hello, C#! と 1 + 2 が2行で出る", "エラーになる", "何も表示されない"], answer: 0, explain: "1 + 2 は計算されて 3 になります。" },
      { q: "Console.WriteLine がしていることは？", options: ["文字や値を1行表示して改行", "キーボード入力を待つ", "ファイルに保存する", "変数を消す"], answer: 0 },
      { q: "実行が始まるのはどこから？", options: ["Main メソッド", "using の行", "class の宣言", "ファイルの最後"], answer: 0 },
      { q: "Console.WriteLine(10 - 3); の表示は？", options: ["7", "10 - 3", "3", "エラーになる"], answer: 0, explain: "式が計算されて 7 が表示されます。" },
      { q: "using System; は何のために書く？", options: ["Console などを使えるようにする", "変数を宣言する", "画面を作る", "ファイルを消す"], answer: 0 },
      { q: "Console.WriteLine(\"A\"); の直後に Console.Write(\"B\"); を実行すると？", options: ["A で改行され、次の行に B", "A B と1行で出る", "AB と1行で出る", "B で改行され、次の行に A"], answer: 0, explain: "WriteLine は改行、Write は改行しません。" },
      { type: "input", q: "Console.WriteLine(1 + 2); が表示する数字を入力してください", mode: "numeric", answers: ["3"], explain: "1 + 2 = 3 が表示されます。" },
      { type: "input", q: "実行が始まるメソッドの名前を英字で入力してください", answers: ["main"], explain: "Main メソッドから始まります。" }
    ]
  },

  {
    id: "vars",
    section: "値と型",
    title: "変数と型",
    body: `
      <p>値を入れておく箱が<strong>変数</strong>で、箱の種類が<strong>型</strong>です。名前は自分で決められます（英数字と <code>_</code>、先頭は数字以外）。</p>
      <p><code>var</code> を使うと右辺から型を推論してくれますが、「型を書かない」だけであって、型が無くなるわけではありません。あとから別の型を入れることはできません。</p>
      <ul>
        <li><code>int</code> 整数 / <code>double</code> 小数 / <code>string</code> 文字列 / <code>bool</code> true・false</li>
        <li>型が決まっていると、おかしな代入をコンパイル時に弾ける</li>
      </ul>`,
    code: `int age = 20;
double pi = 3.14;
string name = "Kanon";
bool ok = true;

var n = 10;        // 整数なので int と推論される
age = age + 1;     // 21`,
    questions: [
      { q: "var n = 10; のとき、n の型は？", options: ["int", "double", "string", "var という型"], answer: 0, explain: "10 は整数リテラルなので int になります。" },
      { q: "小数を入れる型は？", options: ["double", "int", "bool", "string"], answer: 0 },
      { q: "var x = 3.14; のとき、x の型は？", options: ["double", "int", "string", "bool"], answer: 0, explain: "3.14 は小数リテラルなので double と推論されます。" },
      { q: "bool に代入できるのは？", options: ["true か false", "0 か 1 の数値", "\"true\" という文字列", "何でも"], answer: 0 },
      { q: "int x = 5; の後に x = \"hi\"; と書くと？", options: ["エラーになる", "x が hi になる", "x が 0 になる", "hi が数値になる"], answer: 0, explain: "int の箱に文字列は入れられません。型が合わないとコンパイルエラーです。" },
      { q: "string name = ...; に代入できないのは？", options: ["42", "\"abc\"", "\"こんにちは\"", "\"\""], answer: 0 },
      { type: "input", q: "整数を表す型の名前を英字で入力してください", answers: ["int"], explain: "整数は int です。" },
      { type: "input", q: "小数を表す型の名前を英字で入力してください", answers: ["double"], explain: "小数は double です。" }
    ]
  },

  {
    id: "interp",
    section: "値と型",
    title: "文字列と補間",
    body: `
      <p>文字列は <code>+</code> でつなげられますが、変数を混ぜると読みにくくなります。そこで <code>$"..."</code> の<strong>文字列補間</strong>を使います。<code>$</code> を付けた文字列の中の <code>{ }</code> が、その中身の値に置き換わります。</p>
      <ul>
        <li><code>+</code> … 文字列の連結（片方が文字列ならもう片方も文字列になる）</li>
        <li><code>$"{名前}"</code> … 変数や式を埋め込む</li>
        <li><code>.Length</code> … 文字数を返す</li>
      </ul>
      <p class="note">「文字列＋数値」の <code>+</code> は足し算ではなく連結になります（例: <code>"5" + 5</code> は <code>"55"</code>）。</p>`,
    code: `string name = "Kanon";
int n = 3;

Console.WriteLine("Hi " + name);         // Hi Kanon
Console.WriteLine($"Hi {name}, {n}人");  // Hi Kanon, 3人
Console.WriteLine(name.Length);          // 5`,
    questions: [
      { q: "int x = 2; のとき、Console.WriteLine($\"xは{x}です\"); の表示は？", code: `int x = 2;\nConsole.WriteLine($"xは{x}です");`, options: ["xは2です", "xは{x}です", "xはxです", "エラーになる"], answer: 0, explain: "{ } の中は式として評価され、値が埋め込まれます。" },
      { q: "name.Length が表すものは？", options: ["文字数", "文字列の中身", "改行コード", "型の名前"], answer: 0 },
      { q: "\"abc\".Length の値は？", options: ["3", "abc", "0", "エラーになる"], answer: 0 },
      { q: "文字列の連結に使う演算子は？", options: ["+", "&", ".", "*"], answer: 0 },
      { q: "文字列補間を使うとき、文字列の先頭に付ける記号は？", options: ["$", "@", "#", "%"], answer: 0 },
      { q: "\"5\" + 5 のように文字列と数値を + すると？", options: ["\"55\" になる（文字列として連結）", "10 になる", "エラーになる", "5 になる"], answer: 0, explain: "片方が文字列だと、もう片方も文字列に変換されて連結されます。" },
      { type: "input", q: "\"abc\".Length の値（文字数）を数字で入力してください", mode: "numeric", answers: ["3"], explain: "a・b・c の3文字です。" },
      { type: "input", q: "文字列を連結する演算子を1文字で入力してください", answers: ["+", "＋"], explain: "+ でつなげます。" }
    ]
  },

  {
    id: "numbers",
    section: "値と型",
    title: "計算と演算子",
    body: `
      <p><code>+ - * / %</code> が使えます。計算の順番はふつうの算数と同じで、<code>*</code> や <code>/</code> が <code>+</code> や <code>-</code> より先です。<code>( )</code> で順番を変えられます。</p>
      <p><strong>整数同士の割り算は整数</strong>になり、小数点以下は切り捨てられます。小数で計算したいときは、どちらかを <code>7.0</code> のように書きます。</p>
      <ul>
        <li><code>%</code> … 割った余り</li>
        <li><code>x++</code> / <code>x--</code> … 1 増やす / 1 減らす</li>
        <li><code>x += 3</code> … <code>x = x + 3</code> の省略形</li>
      </ul>`,
    code: `Console.WriteLine(7 + 3);   // 10
Console.WriteLine(7 / 2);   // 3   ← 整数の割り算！
Console.WriteLine(7 % 2);   // 1
Console.WriteLine(7.0 / 2); // 3.5

int c = 0;
c++;                        // 1 増える`,
    questions: [
      { q: "Console.WriteLine(7 / 2); の結果は？", options: ["3", "3.5", "4", "エラーになる"], answer: 0, explain: "int 同士の割り算は整数。小数点以下は切り捨て。" },
      { q: "Console.WriteLine(10 % 3); の結果は？", options: ["1", "3", "3.33", "0"], answer: 0, explain: "% は余り。10 を 3 で割った余りは 1。" },
      { q: "5 + 3 * 2 の結果は？", options: ["11", "16", "10", "8"], answer: 0, explain: "かけ算が先。5 + 6 = 11。" },
      { q: "int x = 10; x -= 3; のあと x は？", options: ["7", "13", "3", "10"], answer: 0, explain: "x -= 3 は x = x - 3。" },
      { q: "余りを求める演算子は？", options: ["%", "/", "*", "#"], answer: 0 },
      { q: "int x = 5; のとき Console.WriteLine(x * 2 + 1); の結果は？", options: ["11", "12", "10", "51"], answer: 0 },
      { type: "input", q: "Console.WriteLine(7 % 3); が表示する数字を入力してください", mode: "numeric", answers: ["1"], explain: "7 を 3 で割った余りは 1 です。" },
      { type: "input", q: "Console.WriteLine(10 / 4); が表示する数字を入力してください（整数の割り算）", mode: "numeric", answers: ["2"], explain: "整数の割り算なので 2.5 ではなく 2 になります。" }
    ]
  },

  {
    id: "if",
    section: "制御",
    title: "条件分岐 if / else",
    body: `
      <p>条件が成り立つときだけ処理を実行します。条件は <code>true</code>（真）か <code>false</code>（偽）になる式で書きます。</p>
      <ul>
        <li>比較: <code>&gt;</code> <code>&gt;=</code> <code>&lt;</code> <code>&lt;=</code> <code>==</code> <code>!=</code></li>
        <li>組み合わせ: <code>&amp;&amp;</code> かつ / <code>||</code> または / <code>!</code> 否定</li>
        <li><code>else if</code> を並べると、上から順に見て最初に当てはまった所だけ実行される</li>
      </ul>
      <p class="note"><code>=</code> は代入、<code>==</code> は比較。ここを間違えると意図しない動きになります。</p>`,
    code: `int score = 75;

if (score >= 80)
    Console.WriteLine("優");
else if (score >= 60)
    Console.WriteLine("良");
else
    Console.WriteLine("不可");`,
    questions: [
      { q: "score = 75 のとき、表示されるのは？", options: ["良", "優", "不可", "何も表示されない"], answer: 0, explain: "80 以上ではないので次の条件へ。60 以上なので「良」。" },
      { q: "score = 50 のとき、表示されるのは？", options: ["不可", "良", "優", "何も表示されない"], answer: 0, explain: "80 以上でも 60 以上でもないので else に来ます。" },
      { q: "「a かつ b」を表す書き方は？", options: ["a && b", "a || b", "a !b", "a and b"], answer: 0, explain: "&& が AND、|| が OR、! が NOT。" },
      { q: "!ok は何を意味する？", options: ["ok が false のとき真になる", "ok が true のとき真になる", "ok を削除する", "ok を足す"], answer: 0 },
      { q: "値が等しいかどうかを比べる演算子は？", options: ["==", "=", "===", "!="], answer: 0, explain: "= は代入、== が比較です。" },
      { q: "int a = 1, b = 2; のとき、if (a > b) の条件は？", options: ["false（else 側が実行される）", "true", "エラーになる", "両方実行される"], answer: 0 },
      { type: "input", q: "「～かつ～」を表す記号を2文字で入力してください", answers: ["&&"], explain: "AND は && です。" },
      { type: "input", q: "int a = 1, b = 2; のとき a < b は true / false のどちら？ 英字で入力してください", answers: ["true"], explain: "1 < 2 は成り立つので true です。" }
    ]
  },

  {
    id: "switch",
    section: "制御",
    title: "switch 文",
    body: `
      <p>1つの値によって処理を分けるとき、<code>if</code> を並べるより <code>switch</code> の方が見通しが良くなります。</p>
      <p>各 <code>case</code> の最後には <code>break;</code> を書きます。<strong>break を忘れると、次の case の処理まで続けて実行されてしまう</strong>ので注意してください。</p>
      <ul>
        <li>どの case にも当てはまらないときは <code>default</code> が実行される</li>
        <li><code>default</code> の位置はどこでもよい（末尾が分かりやすい）</li>
        <li>判定できるのは数値や文字列、文字など</li>
      </ul>`,
    code: `string cmd = "start";

switch (cmd)
{
    case "start":
        Console.WriteLine("開始");
        break;
    case "stop":
        Console.WriteLine("停止");
        break;
    default:
        Console.WriteLine("不明");
        break;
}`,
    questions: [
      { q: "cmd = \"stop\" のとき、表示されるのは？", options: ["停止", "開始", "不明", "エラーになる"], answer: 0 },
      { q: "この表示は？", code: `int n = 2;\nswitch (n)\n{\n    case 1: Console.WriteLine("A"); break;\n    case 2: Console.WriteLine("B"); break;\n}`, options: ["B", "A", "A と B", "何も表示されない"], answer: 0, explain: "n が 2 なので case 2 が実行されます。" },
      { q: "どの case にも当てはまらないときに実行されるのは？", options: ["default", "else", "finally", "catch"], answer: 0 },
      { q: "default を書く位置は？", options: ["どこに書いてもよい", "必ず最後", "必ず最初", "書いてはいけない"], answer: 0 },
      { q: "case の最後に break; を書くのを忘れると？", options: ["次の case の処理まで流れ込む", "必ずエラーになる", "何も起きない", "default が消える"], answer: 0 },
      { q: "switch の対象としてよく使う型は？", options: ["int や string", "画像データ", "ファイル", "クラス定義"], answer: 0 },
      { type: "input", q: "どの case にも当てはまらないときに実行されるキーワードを英字で入力してください", answers: ["default"], explain: "default が実行されます。" },
      { type: "input", q: "case の処理を終えるときに書くキーワードを英字で入力してください", answers: ["break"], explain: "break で switch を抜けます。" }
    ]
  },

  {
    id: "loops",
    section: "制御",
    title: "繰り返し for / while",
    body: `
      <p><code>for</code> は「回数を決めて」、<code>while</code> は「条件が成り立つ間」繰り返します。</p>
      <p><code>for (初期化; 条件; 更新)</code> の3つは、<em>最初に1回</em> → <em>毎回条件を確認</em> → <em>本体 → 更新</em> の順に動きます。条件が最初から false なら1回も実行されません。</p>
      <ul>
        <li><code>break</code> … ループを途中で抜ける</li>
        <li><code>continue</code> … その回だけ飛ばして次へ</li>
        <li><code>while</code> は条件を自分で false にしないと<strong>無限ループ</strong>になる</li>
      </ul>`,
    code: `for (int i = 0; i < 3; i++)
    Console.WriteLine(i);

int n = 3;
while (n > 0)
{
    Console.WriteLine(n);
    n--;              // これを忘れると無限ループ
}`,
    questions: [
      { q: "for (int i = 0; i < 3; i++) で表示される数字を順に並べると？", options: ["0 1 2", "1 2 3", "0 1 2 3", "1 2"], answer: 0, explain: "i は 0 から始まり i < 3 の間だけ回るので 0,1,2。" },
      { q: "while (n > 0) で n = 3 のとき、表示されるのは？", options: ["3 2 1", "1 2 3", "3 2 1 0", "無限ループになる"], answer: 0, explain: "n-- で減らしていき 0 で条件が false。" },
      { q: "for (int i = 0; i < 5; i++) は何回まわる？", options: ["5 回", "4 回", "6 回", "0 回"], answer: 0 },
      { q: "for (int i = 10; i > 0; i -= 2) は何回まわる？", options: ["5 回", "10 回", "6 回", "2 回"], answer: 0, explain: "10,8,6,4,2 の 5 回です。" },
      { q: "int s = 0; for (int i = 1; i <= 3; i++) s += i; のあと s は？", options: ["6", "3", "9", "1"], answer: 0, explain: "1+2+3 で 6 になります（s += i は s = s + i）。" },
      { q: "while (true) { ... } のように条件が常に真だと？", options: ["break などで抜けない限り無限に繰り返す", "1回で終わる", "エラーになる", "0回で終わる"], answer: 0 },
      { type: "input", q: "for (int i = 0; i < 4; i++) は何回まわる？ 数字で入力してください", mode: "numeric", answers: ["4"], explain: "0,1,2,3 の4回です。" },
      { type: "input", q: "ループを途中で抜けるキーワードを英字で入力してください", answers: ["break"], explain: "break でループを抜けます。" }
    ]
  },

  {
    id: "arrays",
    section: "データ",
    title: "配列と List",
    body: `
      <p>複数の値をまとめて扱います。<strong>添字は 0 から</strong>始まる点が最重要です。3つ入っていれば、有効な添字は 0,1,2 で、3 は範囲外です。</p>
      <ul>
        <li><code>int[]</code>（配列）… 個数を後から変えられない。要素数は <code>.Length</code></li>
        <li><code>List&lt;int&gt;</code> … <code>Add</code> で増やせる。要素数は <code>.Count</code></li>
      </ul>
      <p class="note">範囲外の添字にアクセスすると例外で止まります。「配列は Length、List は Count」とセットで覚えましょう。</p>`,
    code: `int[] nums = { 10, 20, 30 };
Console.WriteLine(nums[0]);      // 10
Console.WriteLine(nums.Length);  // 3

var list = new List<int> { 1, 2 };
list.Add(3);                     // 追加できる
Console.WriteLine(list.Count);   // 3`,
    questions: [
      { q: "int[] nums = { 10, 20, 30 }; のとき、nums[0] は？", options: ["10", "20", "30", "エラーになる"], answer: 0, explain: "添字は 0 から。" },
      { q: "配列と List の違いは？", options: ["List は要素を追加・削除できる", "配列は個数を後から増やせる", "List の方が必ず速い", "違いはない"], answer: 0 },
      { q: "int[] a = { 1, 2, 3 }; のとき a.Length は？", options: ["3", "2", "4", "0"], answer: 0 },
      { q: "int[] a = { 1, 2, 3 }; のとき a[3] にアクセスすると？", options: ["エラー（範囲外）", "0 になる", "3 になる", "null になる"], answer: 0, explain: "有効な添字は 0〜2 です。" },
      { q: "List<int> の要素数を取得するのは？", options: ["Count", "Length", "Size", "Total"], answer: 0, explain: "配列は Length、List は Count です。" },
      { q: "List に要素を追加するメソッドは？", options: ["Add", "Push", "Append", "InsertEnd"], answer: 0 },
      { type: "input", q: "int[] a = { 5, 6, 7, 8 }; のとき a.Length を数字で入力してください", mode: "numeric", answers: ["4"], explain: "要素は4つです。" },
      { type: "input", q: "List の要素数を取得するプロパティ名を英字で入力してください", answers: ["count"], explain: "List は Count、配列は Length です。" }
    ]
  },

  {
    id: "methods",
    section: "データ",
    title: "メソッド（関数）",
    body: `
      <p>処理に名前を付けてまとめたものが<strong>メソッド</strong>です。同じ処理を何度も書かずに済み、テストもしやすくなります。</p>
      <ul>
        <li>定義: <code>戻り値の型 名前(引数の型 引数名, ...)</code></li>
        <li><code>return</code> で値を返す。<code>void</code> は「戻り値なし」</li>
        <li>呼ぶときに渡す値を<strong>引数</strong>、返ってくる値を<strong>戻り値</strong>と呼ぶ</li>
      </ul>
      <p class="note">戻り値の型と <code>return</code> する値の型は合わせる必要があります。</p>`,
    code: `static int Add(int a, int b)
{
    return a + b;
}

static void Greet(string name)
{
    Console.WriteLine($"Hi {name}");
}

int r = Add(2, 3);   // 5
Greet("Kanon");      // Hi Kanon`,
    questions: [
      { q: "Add(2, 3) の戻り値は？", options: ["5", "23", "2", "エラーになる"], answer: 0 },
      { q: "戻り値の型に void と書くと、どういう意味？", options: ["戻り値がない", "引数がない", "必ず 0 を返す", "非公開という意味"], answer: 0 },
      { q: "static int F() { return 3; } のとき Console.WriteLine(F() + 1); の結果は？", options: ["4", "31", "3", "エラーになる"], answer: 0 },
      { q: "引数を2つ受け取り、値を返さないメソッドの宣言は？", options: ["static void F(int a, int b)", "static int F(int a, int b)", "void static F", "int F"], answer: 0 },
      { q: "Add(2, 3) の 2 や 3 のように、呼ぶときに渡す値を何と呼ぶ？", options: ["引数", "戻り値", "型", "プロパティ"], answer: 0 },
      { q: "同じ処理をメソッドにまとめる利点は？", options: ["何度も書かずに再利用できる", "実行が必ず速くなる", "型を書かなくてよくなる", "変数が消える"], answer: 0 },
      { type: "input", q: "値を返さない（戻り値がない）ことを表すキーワードを英字で入力してください", answers: ["void"], explain: "void は戻り値なしの意味です。" },
      { type: "input", q: "値を返すときに使うキーワードを英字で入力してください", answers: ["return"], explain: "return で値を返します。" }
    ]
  },

  {
    id: "classes",
    section: "オブジェクト指向",
    title: "クラスとオブジェクト",
    body: `
      <p>データと処理をひとまとめにした設計図が<strong>クラス</strong>、そこから作った実体が<strong>オブジェクト</strong>です。</p>
      <p>クラスの中に書いた変数を<strong>フィールド</strong>、処理を<strong>メソッド</strong>と呼びます。<code>new</code> でオブジェクトを作り、<code>.</code>（ドット）で中のものにアクセスします。</p>
      <ul>
        <li>1つのクラスから何個でもオブジェクトを作れる</li>
        <li>各オブジェクトは自分のフィールドを別々に持つ（ポチとタロウは別々の名前）</li>
      </ul>`,
    code: `class Dog
{
    public string Name;

    public void Bark()
    {
        Console.WriteLine($"{Name}: ワン!");
    }
}

var d = new Dog();
d.Name = "ポチ";
d.Bark();   // ポチ: ワン!`,
    questions: [
      { q: "new Dog() がしていることは？", options: ["Dog のオブジェクトを作る", "Dog を削除する", "Name を必ず初期化する", "Bark を定義する"], answer: 0 },
      { q: "d.Bark() で表示されるのは？", options: ["ポチ: ワン!", "Name: ワン!", "ワン!", "エラーになる"], answer: 0, explain: "{Name} には d の Name（\"ポチ\"）が入ります。" },
      { q: "d.Name = \"ポチ\"; は何をしている？", options: ["オブジェクト d の Name に値を入れる", "クラス Dog を作る", "メソッドを呼ぶ", "Name を削除する"], answer: 0 },
      { q: "クラスからオブジェクトを作るキーワードは？", options: ["new", "make", "create", "object"], answer: 0 },
      { q: "クラスの中の変数（例: Name）を何と呼ぶ？", options: ["フィールド", "ローカル変数", "引数", "型"], answer: 0 },
      { q: "1つのクラスから作れるオブジェクトの数は？", options: ["何個でも作れる", "1つだけ", "2つまで", "0個"], answer: 0 },
      { type: "input", q: "クラスからオブジェクトを作るキーワードを英字で入力してください", answers: ["new"], explain: "new で作ります。" },
      { type: "input", q: "クラスから作った「実体」のことを何と呼ぶ？（カタカナで）", answers: ["オブジェクト", "インスタンス"], explain: "オブジェクト（インスタンス）と呼びます。" }
    ]
  },

  {
    id: "props",
    section: "オブジェクト指向",
    title: "プロパティとカプセル化",
    body: `
      <p><code>{ get; set; }</code> の形を<strong>プロパティ</strong>と呼びます。フィールドを外から直接いじらせず、読み書きの入口をまとめる仕組みです。</p>
      <p><code>private set;</code> にすると、外からは読めるけど書き換えられなくなります。こうして<strong>勝手に触られないようにする</strong>ことを<strong>カプセル化</strong>といいます。</p>
      <ul>
        <li><code>get</code> … 読み取り / <code>set</code> … 書き込み</li>
        <li><code>private set</code> … 読み取りは外から、書き込みはクラスの中だけ</li>
      </ul>`,
    code: `class Counter
{
    public int Value { get; private set; }

    public void Inc() => Value++;
}

var c = new Counter();
c.Inc();
c.Inc();
Console.WriteLine(c.Value);  // 2`,
    questions: [
      { q: "public int Value { get; private set; } のとき、外から Value に代入できる？", options: ["できない", "できる", "読み取りもできない", "文字列を入れられる"], answer: 0, explain: "private set; なので setter はクラスの中からのみ。" },
      { q: "c.Inc() を2回呼んだ後の c.Value は？", options: ["2", "1", "0", "エラーになる"], answer: 0 },
      { q: "Value++ は Value をどうする？", options: ["1 増やす", "1 減らす", "0 にする", "2倍にする"], answer: 0 },
      { q: "{ get; set; } の形を何と呼ぶ？", options: ["プロパティ", "メソッド", "フィールド", "コンストラクタ"], answer: 0 },
      { q: "外から勝手に書き換えられないようにすることを？", options: ["カプセル化", "継承", "抽象化", "多態性"], answer: 0 },
      { q: "get; だけ書いたプロパティ（set; なし）はどうなる？", options: ["読み取り専用になる", "書き込み専用になる", "必ずエラーになる", "何も変わらない"], answer: 0 },
      { type: "input", q: "値を1増やす演算子を2文字で入力してください", answers: ["++"], explain: "x++ で1増えます。" },
      { type: "input", q: "{ get; set; } の形を何と呼ぶ？（カタカナで）", answers: ["プロパティ"], explain: "プロパティと呼びます。" }
    ]
  },

  {
    id: "linq",
    section: "一歩先",
    title: "LINQ でコレクション操作",
    body: `
      <p>リストなどに対して「絞り込み・変換・集計」をメソッドチェーンで書けるのが <strong>LINQ</strong> です。for で回して条件分岐…という定番の処理を短く書けます。</p>
      <ul>
        <li><code>Where(n =&gt; 条件)</code> … 条件に合うものだけ残す</li>
        <li><code>Select(n =&gt; 変換)</code> … それぞれを別の値に変える</li>
        <li><code>Count(n =&gt; 条件)</code> … 条件に合う個数を数える</li>
      </ul>
      <p class="note"><code>n =&gt; n * 2</code> は「n を受け取って n*2 を返す」小さな関数（ラムダ式）です。</p>`,
    code: `var nums = new List<int> { 1, 2, 3, 4, 5, 6 };

var evens   = nums.Where(n => n % 2 == 0);  // 2, 4, 6
var doubled = nums.Select(n => n * 2);      // 2, 4, 6, 8, 10, 12

Console.WriteLine(nums.Count(n => n > 3)); // 3`,
    questions: [
      { q: "nums.Where(n => n % 2 == 0) が残すのは？", options: ["偶数だけ", "奇数だけ", "すべて", "何も残らない"], answer: 0 },
      { q: "nums.Count(n => n > 3) の結果は？", options: ["3", "4", "6", "0"], answer: 0, explain: "3 より大きいのは 4, 5, 6 の3つ。" },
      { q: "nums.Select(n => n * 2) の結果は？", options: ["2, 4, 6, 8, 10, 12", "1, 2, 3, 4, 5, 6", "2, 4, 6", "6, 5, 4, 3, 2, 1"], answer: 0 },
      { q: "それぞれの要素を変換したいときに使うのは？", options: ["Select", "Where", "Count", "OrderBy"], answer: 0 },
      { q: "LINQ を使うと何が嬉しい？", options: ["絞り込み・変換・集計を簡潔に書ける", "実行が必ず速くなる", "メモリが減る", "型を書かなくてよくなる"], answer: 0 },
      { q: "n => n * 2 の n は何を表す？", options: ["各要素", "リスト全体", "インデックス", "型名"], answer: 0 },
      { type: "input", q: "条件に合うものだけを残す LINQ メソッド名を英字で入力してください", answers: ["where"], explain: "Where で絞り込みます。" },
      { type: "input", q: "各要素を変換する LINQ メソッド名を英字で入力してください", answers: ["select"], explain: "Select で変換します。" }
    ]
  },

  {
    id: "exceptions",
    section: "一歩先",
    title: "例外処理 try / catch",
    body: `
      <p>エラーが起きたときは<strong>例外</strong>が投げられます。放っておくとプログラムはそこで止まってしまいます。</p>
      <p><code>try</code> の中でエラーが起きたら <code>catch</code> に飛び、そこで受け止めれば続行できます。<code>finally</code> は例外の有無にかかわらず必ず実行されます（後始末などに使います）。</p>
      <ul>
        <li><code>catch (型)</code> で捕まえる例外の種類を指定する</li>
        <li><code>catch</code> を複数並べると種類ごとに分けられる</li>
      </ul>`,
    code: `try
{
    int x = int.Parse("abc");  // 数値じゃないので例外
}
catch (FormatException)
{
    Console.WriteLine("数値じゃなかった");
}`,
    questions: [
      { q: "int.Parse(\"abc\") を try/catch なしで実行すると？", options: ["例外で処理が止まる", "0 になる", "null になる", "自動で直る"], answer: 0 },
      { q: "このコードの表示は？", options: ["数値じゃなかった", "abc", "0", "何も表示されない"], answer: 0 },
      { q: "例外を受け止めるキーワードは？", options: ["catch", "then", "rescue", "handle"], answer: 0 },
      { q: "catch (FormatException) が捕まえるのは？", options: ["書式エラーの例外", "ゼロ除算の例外", "ファイル未検出の例外", "すべての例外"], answer: 0 },
      { q: "catch を複数書くと？", options: ["例外の種類ごとに分けて処理できる", "エラーになる", "最後の1つだけ有効", "必ず全部が同時に動く"], answer: 0 },
      { q: "finally の中はいつ実行される？", options: ["例外の有無にかかわらず（後始末など）", "例外のときだけ", "正常終了のときだけ", "実行されない"], answer: 0 },
      { type: "input", q: "例外を受け止めるキーワードを英字で入力してください", answers: ["catch"], explain: "catch で受け止めます。" },
      { type: "input", q: "例外の有無にかかわらず必ず実行されるブロックのキーワードを英字で入力してください", answers: ["finally"], explain: "finally は必ず実行されます。" }
    ]
  }
];
