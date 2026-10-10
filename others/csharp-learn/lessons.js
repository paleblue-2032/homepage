// 基礎編の教材データ。本文は HTML（本文中のコードは <pre class="code" data-code> でハイライトされる）。
// クイズは選択式（options/answer）と入力式（type:"input"/answers）。

// ---- レベルチェック ----
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

window.LESSONS = [];

window.LESSONS.push(
  {
    id: "intro",
    section: "はじめの一歩",
    title: "C# ってなに？",
    body: `
      <p>C#（シーシャープ）は Microsoft が作った<strong>静的型付け</strong>のオブジェクト指向言語です。Java や C++ の良いところを取り入れて設計され、いまも毎年のように機能が追加されています。</p>

      <h3>なぜ「コンパイル」するのか</h3>
      <p>C# は書いたコードをそのまま実行するのではなく、いったん<strong>コンパイル</strong>という作業で実行できる形に変換してから動かします。変換の段階で「型が合っていない」「存在しない名前を使っている」といった間違いを<strong>実行前に</strong>見つけられます。バグを早く潰せるのが大きな利点です。</p>

      <h3>どこで動くか</h3>
      <p>実行を支えるのが <code>.NET</code> という実行環境です。同じ C# のコードが、Windows・macOS・Linux、さらにはブラウザ（WebAssembly）でも動きます。</p>

      <h3>どんなものに使われているか</h3>
      <table>
        <tr><th>分野</th><th>例</th></tr>
        <tr><td>ゲーム</td><td>Unity のスクリプト</td></tr>
        <tr><td>Web / API</td><td>ASP.NET Core</td></tr>
        <tr><td>業務システム</td><td>Windows アプリ・サーバー処理</td></tr>
        <tr><td>デスクトップ</td><td>Windows アプリ、Avalonia など</td></tr>
      </table>

      <h3>ポイント</h3>
      <ul>
        <li>型が決まっているので、エディタが補完や警告を出してくれる</li>
        <li>コンパイルという関門があるぶん、実行時の単純なミスが減る</li>
        <li>読み方は「シーシャープ」。ファイルの拡張子は <code>.cs</code></li>
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
      { q: "コンパイルすることの利点は？", options: ["間違いを実行前に見つけやすい", "実行が必ず速くなる", "コードが自動で短くなる", "型を書かなくてよくなる"], answer: 0 },
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

      <h3>コードの形</h3>
      <p>文の終わりには <code>;</code>（セミコロン）を付けます。処理のまとまりは <code>{ }</code>（波かっこ）で囲みます。最初は「<code>;</code> は文の区切り」「<code>{ }</code> はまとまり」と覚えれば十分です。</p>
      <pre class="code" data-code>using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("Hello, C#!");
    }
}</pre>

      <h3>WriteLine と Write の違い</h3>
      <p><code>WriteLine</code> は表示したあとに改行します。<code>Write</code> は改行しません。</p>
      <pre class="code" data-code>Console.Write("A");
Console.Write("B");
Console.WriteLine();     // ここで改行
Console.WriteLine("C");
// 表示: AB のあと改行して C</pre>

      <h3>コメント</h3>
      <p><code>//</code> から行末まではメモになります。動作には影響しません。</p>
      <pre class="code" data-code>// これはコメント
int x = 1; // 行の後ろにも書ける</pre>`,
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
      { q: "文の終わりに付ける記号は？", options: [";", ":", ".", ","], answer: 0 },
      { type: "input", q: "Console.WriteLine(1 + 2); が表示する数字を入力してください", mode: "numeric", answers: ["3"], explain: "1 + 2 = 3 が表示されます。" },
      { type: "input", q: "実行が始まるメソッドの名前を英字で入力してください", answers: ["main"], explain: "Main メソッドから始まります。" }
    ]
  },

  {
    id: "vars",
    section: "値と型",
    title: "変数と型",
    body: `
      <p>値を入れておく箱が<strong>変数</strong>で、箱の種類が<strong>型</strong>です。「この箱には数値」「この箱には文字列」と決めることで、間違いを早く見つけられます。</p>

      <h3>よく使う型</h3>
      <table>
        <tr><th>型</th><th>入るもの</th><th>例</th></tr>
        <tr><td>int</td><td>整数</td><td>1, -5, 1000</td></tr>
        <tr><td>double</td><td>小数</td><td>3.14, -0.5</td></tr>
        <tr><td>string</td><td>文字列</td><td>"Hello"</td></tr>
        <tr><td>bool</td><td>真/偽</td><td>true, false</td></tr>
        <tr><td>char</td><td>1文字</td><td>'A'</td></tr>
      </table>

      <h3>宣言と代入</h3>
      <pre class="code" data-code>int age = 20;      // 宣言と同時に代入
age = age + 1;     // あとから書き換え（再代入）

int count;         // 宣言だけ
count = 5;         // あとで代入</pre>

      <h3>var（型の推論）</h3>
      <p><code>var</code> を使うと右辺から型を推論してくれますが、型が無くなるわけではありません。あとから別の型を入れることはできません。</p>
      <pre class="code" data-code>var n = 10;      // int と推論される
var s = "abc";   // string と推論される
n = "x";         // エラー！ int の箱に文字列は入らない</pre>

      <h3>名前に使える文字</h3>
      <p>英数字と <code>_</code> が使えます。先頭は数字以外。予約語（<code>int</code> など）は使えません。</p>`,
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
      { q: "1文字だけを表す型は？", options: ["char", "bool", "double", "int"], answer: 0 },
      { type: "input", q: "整数を表す型の名前を英字で入力してください", answers: ["int"], explain: "整数は int です。" },
      { type: "input", q: "真偽（true/false）を表す型の名前を英字で入力してください", answers: ["bool"], explain: "true/false は bool です。" }
    ]
  },

  {
    id: "interp",
    section: "値と型",
    title: "文字列と補間",
    body: `
      <p>文字列は <code>"..."</code> で囲みます。<code>+</code> でつなげられますが、変数を混ぜると読みにくくなります。そこで<strong>文字列補間</strong>を使います。</p>

      <h3>連結と補間</h3>
      <pre class="code" data-code>string name = "Kanon";
int n = 3;

// 連結
Console.WriteLine("Hi " + name);

// 補間（先頭に $ を付ける）
Console.WriteLine($"Hi {name}, {n}人");</pre>
      <p><code>$</code> を付けた文字列の中では、<code>{ }</code> の中が式として評価されて埋め込まれます。計算も書けます。</p>
      <pre class="code" data-code>int a = 2, b = 3;
Console.WriteLine($"{a} + {b} = {a + b}");  // 2 + 3 = 5</pre>

      <h3>文字列と + の注意</h3>
      <p>片方が文字列だと、もう片方も文字列として連結されます。数値の足し算のつもりでも、連結になってしまうことがあります。</p>
      <pre class="code" data-code>Console.WriteLine("5" + 5);   // 55
Console.WriteLine(5 + 5);     // 10</pre>

      <h3>文字数</h3>
      <p><code>.Length</code> で文字数を取得できます。</p>`,
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

      <h3>整数の割り算に注意</h3>
      <p><strong>整数同士の割り算は整数</strong>になり、小数点以下は切り捨てられます。小数で計算したいときは、どちらかを <code>7.0</code> のように書きます。</p>
      <pre class="code" data-code>Console.WriteLine(7 / 2);     // 3   （切り捨て）
Console.WriteLine(7.0 / 2);   // 3.5
Console.WriteLine(7 % 2);     // 1   （余り）</pre>

      <h3>型の変換</h3>
      <p>int と double を混ぜると自動で double にそろいます。逆に小数から整数へは <code>(int)</code> で明示的に変換します（切り捨て）。</p>
      <pre class="code" data-code>int a = 5;
double b = a / 2.0;     // 2.5
int c = (int)3.9;       // 3</pre>

      <h3>省略記法とインクリメント</h3>
      <pre class="code" data-code>int x = 10;
x += 3;    // x = x + 3 → 13
x -= 2;    // 11
x++;       // 12（1増やす）
x--;       // 11（1減らす）</pre>

      <h3>ポイント</h3>
      <ul>
        <li>割り算の結果がおかしいときは、まず整数同士かどうかを疑う</li>
        <li><code>%</code> は「余り」。偶数判定（<code>n % 2 == 0</code>）などによく使う</li>
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
      { q: "(int)3.9 の値は？", options: ["3", "4", "3.9", "エラーになる"], answer: 0, explain: "整数への変換は切り捨てなので 3 になります。" },
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

      <h3>比較演算子</h3>
      <table>
        <tr><th>演算子</th><th>意味</th></tr>
        <tr><td>a == b</td><td>等しい</td></tr>
        <tr><td>a != b</td><td>等しくない</td></tr>
        <tr><td>a &gt; b / a &gt;= b</td><td>より大きい / 以上</td></tr>
        <tr><td>a &lt; b / a &lt;= b</td><td>より小さい / 以下</td></tr>
      </table>

      <h3>組み合わせ</h3>
      <p><code>&amp;&amp;</code> は「かつ」、<code>||</code> は「または」、<code>!</code> は「否定」です。</p>
      <pre class="code" data-code>int age = 20;
bool member = true;

if (age >= 18 && member)
    Console.WriteLine("入れます");
else
    Console.WriteLine("入れません");</pre>

      <h3>else if の順番</h3>
      <p>上から順に見て、<strong>最初に当てはまった所だけ</strong>実行されます。条件の順番が結果を左右します。</p>
      <pre class="code" data-code>int score = 75;

if (score >= 80)
    Console.WriteLine("優");
else if (score >= 60)
    Console.WriteLine("良");
else
    Console.WriteLine("不可");
// 75 なので「良」</pre>

      <h3>三項演算子</h3>
      <p>短い分岐は <code>条件 ? A : B</code> で書けます。</p>
      <pre class="code" data-code>int n = 7;
string s = n % 2 == 0 ? "偶数" : "奇数";   // "奇数"</pre>

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
      { q: "int n = 7; のとき n % 2 == 0 ? \"偶数\" : \"奇数\" の結果は？", options: ["奇数", "偶数", "7", "エラーになる"], answer: 0, explain: "7 は奇数なので else 側の「奇数」になります。" },
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

      <h3>基本の形</h3>
      <pre class="code" data-code>string cmd = "start";

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
}</pre>

      <h3>break を忘れると</h3>
      <p>各 <code>case</code> の最後には <code>break;</code> を書きます。<strong>忘れると、次の case の処理まで続けて実行されてしまいます。</strong></p>

      <h3>default</h3>
      <p>どの case にも当てはまらないときは <code>default</code> が実行されます。位置はどこでもよく、末尾に置くのが分かりやすいです。</p>

      <h3>モダンな switch 式（発展）</h3>
      <p>近年の C# では、値を返す「switch 式」も書けます。</p>
      <pre class="code" data-code>int n = 2;
string s = n switch
{
    1 => "one",
    2 => "two",
    _ => "other",   // _ は default 相当
};</pre>`,
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
      <p>同じ処理を繰り返すには <code>for</code> と <code>while</code> を使います。<code>for</code> は回数を決めて、<code>while</code> は条件が成り立つ間まわします。</p>

      <h3>for の動き</h3>
      <p><code>for (初期化; 条件; 更新)</code> は「最初に1回初期化 → 毎回条件を確認 → 本体 → 更新」の順に動きます。条件が最初から false なら1回も実行されません。</p>
      <pre class="code" data-code>for (int i = 0; i < 3; i++)
    Console.WriteLine(i);   // 0 1 2</pre>

      <h3>while と do-while</h3>
      <pre class="code" data-code>int n = 3;
while (n > 0)         // 前で判定
{
    Console.WriteLine(n);
    n--;
}

int m = 0;
do                    // 後ろで判定（最低1回は実行される）
{
    Console.WriteLine(m);
    m++;
} while (m < 3);</pre>

      <h3>break と continue</h3>
      <ul>
        <li><code>break</code> … ループを途中で抜ける</li>
        <li><code>continue</code> … その回だけ飛ばして次へ</li>
      </ul>
      <pre class="code" data-code>for (int i = 0; i < 5; i++)
{
    if (i == 3) break;      // 3 で終了
    Console.WriteLine(i);   // 0 1 2
}</pre>

      <h3>foreach</h3>
      <p>配列や List の中身を順に取り出すには <code>foreach</code> が便利です。</p>
      <pre class="code" data-code>int[] nums = { 10, 20, 30 };
foreach (int x in nums)
    Console.WriteLine(x);</pre>`,
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
      { q: "do-while の while はどこで条件を判定する？", options: ["本体を実行した後", "本体を実行する前", "条件なしで無限", "最初だけ"], answer: 0, explain: "do-while は後判定なので最低1回は実行されます。" },
      { q: "ループを途中で抜けるキーワードは？", options: ["break", "continue", "return", "exit"], answer: 0 },
      { type: "input", q: "for (int i = 0; i < 4; i++) は何回まわる？ 数字で入力してください", mode: "numeric", answers: ["4"], explain: "0,1,2,3 の4回です。" },
      { type: "input", q: "配列や List の中身を順に取り出す繰り返しのキーワードを英字で入力してください", answers: ["foreach"], explain: "foreach で順に取り出せます。" }
    ]
  },

  {
    id: "arrays",
    section: "データ",
    title: "配列と List",
    body: `
      <p>複数の値をまとめて扱います。<strong>添字は 0 から</strong>始まる点が最重要です。3つ入っていれば有効な添字は 0,1,2 で、3 は範囲外です。</p>

      <h3>配列</h3>
      <p>個数を後から変えられません。要素数は <code>.Length</code> です。</p>
      <pre class="code" data-code>int[] nums = { 10, 20, 30 };
Console.WriteLine(nums[0]);      // 10
Console.WriteLine(nums.Length);  // 3

int[] zeros = new int[5];        // 0 が5つ</pre>

      <h3>List</h3>
      <p>要素を追加・削除できます。要素数は <code>.Count</code> です。</p>
      <pre class="code" data-code>var list = new List<int> { 1, 2 };
list.Add(3);          // 追加
list.Remove(1);       // 値 1 を削除
Console.WriteLine(list.Count);   // 2</pre>

      <h3>走査</h3>
      <pre class="code" data-code>foreach (int x in nums)
    Console.WriteLine(x);</pre>

      <h3>ポイント</h3>
      <ul>
        <li>範囲外の添字にアクセスすると例外で止まる</li>
        <li>「配列は Length、List は Count」とセットで覚える</li>
        <li>個数が変わるなら List、固定なら配列</li>
      </ul>`,
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

      <h3>基本の形</h3>
      <p><code>戻り値の型 名前(引数の型 引数名, ...)</code> の形で定義します。</p>
      <pre class="code" data-code>static int Add(int a, int b)
{
    return a + b;      // return で値を返す
}

static void Greet(string name)
{
    Console.WriteLine($"Hi {name}");   // void は戻り値なし
}</pre>

      <h3>呼び出し</h3>
      <pre class="code" data-code>int r = Add(2, 3);   // 5
Greet("Kanon");      // Hi Kanon</pre>

      <h3>戻り値の型は合わせる</h3>
      <p>宣言した戻り値の型と、<code>return</code> する値の型は合わせる必要があります。<code>void</code> のメソッドは値を返せません。</p>

      <h3>オーバーロード（同じ名前の別バージョン）</h3>
      <p>引数の型や個数が違えば、同じ名前のメソッドを複数定義できます。</p>
      <pre class="code" data-code>static int Add(int a, int b) { return a + b; }
static double Add(double a, double b) { return a + b; }</pre>

      <p class="note">呼ぶときに渡す値を<strong>引数</strong>、返ってくる値を<strong>戻り値</strong>と呼びます。</p>`,
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
      { q: "同じ名前で引数が違うメソッドを複数定義することを何という？", options: ["オーバーロード", "オーバーライド", "オーバーフロー", "インスタンス化"], answer: 0 },
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

      <h3>クラスの中身</h3>
      <p>クラスの中に書いた変数を<strong>フィールド</strong>、処理を<strong>メソッド</strong>と呼びます。<code>new</code> でオブジェクトを作り、<code>.</code>（ドット）で中のものにアクセスします。</p>
      <pre class="code" data-code>class Dog
{
    public string Name;

    public void Bark()
    {
        Console.WriteLine($"{Name}: ワン!");
    }
}

var d = new Dog();
d.Name = "ポチ";
d.Bark();      // ポチ: ワン!</pre>

      <h3>オブジェクトごとに別の値を持つ</h3>
      <p>同じクラスから作っても、それぞれが自分のフィールドを持ちます。</p>
      <pre class="code" data-code>var a = new Dog(); a.Name = "ポチ";
var b = new Dog(); b.Name = "タロウ";
a.Bark();   // ポチ: ワン!
b.Bark();   // タロウ: ワン!</pre>

      <h3>コンストラクタ（作るときの初期化）</h3>
      <p>クラス名と同じ名前のメソッドを書くと、<code>new</code> したときに自動で実行されます。</p>
      <pre class="code" data-code>class Dog
{
    public string Name;
    public Dog(string name) { Name = name; }   // コンストラクタ
}

var d = new Dog("ポチ");</pre>`,
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
      { q: "new したときに自動で実行される特別なメソッドは？", options: ["コンストラクタ", "デストラクタ", "プロパティ", "イベント"], answer: 0 },
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

      <h3>基本と private set</h3>
      <pre class="code" data-code>class Counter
{
    public int Value { get; private set; }   // 外からは読めるが書けない

    public void Inc() => Value++;            // 中からは書き換えられる
}

var c = new Counter();
c.Inc();
Console.WriteLine(c.Value);   // 1
// c.Value = 100;             // エラー（private set）</pre>

      <h3>計算するプロパティ</h3>
      <p><code>get</code> に式を書くと、参照時に計算した値を返せます。</p>
      <pre class="code" data-code>class Circle
{
    public double Radius { get; set; }
    public double Area => 3.14 * Radius * Radius;   // 参照のたびに計算
}</pre>

      <h3>なぜ隠すのか（カプセル化）</h3>
      <ul>
        <li>外から勝手に書き換えられると、クラスの前提が壊れる</li>
        <li>入口を絞ることで、変更の影響範囲を小さくできる</li>
        <li>「読み取りは自由、書き換えはメソッド経由」がよく使われる形</li>
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
      { q: "参照したときに計算した値を返すプロパティの書き方は？", options: ["get => 式 ;", "set => 式 ;", "get; set;", "return 式;"], answer: 0 },
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

      <h3>よく使うメソッド</h3>
      <table>
        <tr><th>メソッド</th><th>やること</th></tr>
        <tr><td>Where</td><td>条件に合うものだけ残す</td></tr>
        <tr><td>Select</td><td>それぞれを別の値に変換する</td></tr>
        <tr><td>Count</td><td>個数を数える</td></tr>
        <tr><td>Sum / Average</td><td>合計 / 平均</td></tr>
        <tr><td>OrderBy</td><td>並べ替える</td></tr>
        <tr><td>First / Any</td><td>最初の1つ / 1つでもあるか</td></tr>
      </table>

      <h3>例</h3>
      <pre class="code" data-code>var nums = new List<int> { 1, 2, 3, 4, 5, 6 };

var evens   = nums.Where(n => n % 2 == 0);       // 2, 4, 6
var doubled = nums.Select(n => n * 2);           // 2, 4, 6, 8, 10, 12
var total   = nums.Sum();                        // 21
Console.WriteLine(nums.Count(n => n > 3));       // 3</pre>

      <h3>ラムダ式</h3>
      <p><code>n =&gt; n * 2</code> は「n を受け取って n*2 を返す」小さな関数です。この書き方で「何をするか」を渡します。</p>

      <h3>つなげて書ける</h3>
      <pre class="code" data-code>var result = nums
    .Where(n => n % 2 == 0)   // 偶数だけ
    .Select(n => n * 10)      // 10倍
    .OrderByDescending(n => n);
// 60, 40, 20</pre>`,
    code: `var nums = new List<int> { 1, 2, 3, 4, 5, 6 };

var evens   = nums.Where(n => n % 2 == 0);  // 2, 4, 6
var doubled = nums.Select(n => n * 2);      // 2, 4, 6, 8, 10, 12

Console.WriteLine(nums.Count(n => n > 3)); // 3`,
    questions: [
      { q: "nums.Where(n => n % 2 == 0) が残すのは？", options: ["偶数だけ", "奇数だけ", "すべて", "何も残らない"], answer: 0 },
      { q: "nums.Count(n => n > 3) の結果は？", options: ["3", "4", "6", "0"], answer: 0, explain: "3 より大きいのは 4, 5, 6 の3つ。" },
      { q: "nums.Select(n => n * 2) の結果は？", options: ["2, 4, 6, 8, 10, 12", "1, 2, 3, 4, 5, 6", "2, 4, 6", "6, 5, 4, 3, 2, 1"], answer: 0 },
      { q: "それぞれの要素を変換したいときに使うのは？", options: ["Select", "Where", "Count", "OrderBy"], answer: 0 },
      { q: "合計を求めるメソッドは？", options: ["Sum", "Count", "Total", "Max"], answer: 0 },
      { q: "n => n * 2 の n は何を表す？", options: ["各要素", "リスト全体", "インデックス", "型名"], answer: 0 },
      { type: "input", q: "条件に合うものだけを残す LINQ メソッド名を英字で入力してください", answers: ["where"], explain: "Where で絞り込みます。" },
      { type: "input", q: "合計を求める LINQ メソッド名を英字で入力してください", answers: ["sum"], explain: "Sum で合計を出せます。" }
    ]
  },

  {
    id: "exceptions",
    section: "一歩先",
    title: "例外処理 try / catch",
    body: `
      <p>エラーが起きたときは<strong>例外</strong>が投げられます。放っておくとプログラムはそこで止まってしまいます。</p>

      <h3>受け止める</h3>
      <p><code>try</code> の中でエラーが起きたら <code>catch</code> に飛び、そこで受け止めれば続行できます。</p>
      <pre class="code" data-code>try
{
    int x = int.Parse("abc");   // 数値じゃないので例外
}
catch (FormatException)
{
    Console.WriteLine("数値じゃなかった");
}</pre>

      <h3>種類ごとに分ける</h3>
      <p>例外の型ごとに <code>catch</code> を並べられます。上から順に照合されるので、具体的なものを先に書きます。</p>
      <pre class="code" data-code>try
{
    int y = 10 / int.Parse("0");
}
catch (FormatException) { Console.WriteLine("書式エラー"); }
catch (DivideByZeroException) { Console.WriteLine("ゼロ除算"); }</pre>

      <h3>finally</h3>
      <p><code>finally</code> は例外の有無にかかわらず必ず実行されます。後始末などに使います。</p>

      <h3>自分で投げる</h3>
      <pre class="code" data-code>if (age < 0)
    throw new ArgumentException("age がマイナスです");</pre>

      <p class="note">例外は「想定外のとき」に使うもの。通常の分岐を例外で書くのは避けましょう。</p>`,
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
      { q: "セミコロン区切りの複数の文をまとめる記号は？", options: ["{ }", "( )", "[ ]", "< >"], answer: 0 },
      { q: "finally の中はいつ実行される？", options: ["例外の有無にかかわらず（後始末など）", "例外のときだけ", "正常終了のときだけ", "実行されない"], answer: 0 },
      { type: "input", q: "例外を受け止めるキーワードを英字で入力してください", answers: ["catch"], explain: "catch で受け止めます。" },
      { type: "input", q: "例外の有無にかかわらず必ず実行されるブロックのキーワードを英字で入力してください", answers: ["finally"], explain: "finally は必ず実行されます。" }
    ]
  }
);
