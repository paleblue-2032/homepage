// 教材データ。本文は HTML、コードは文字列、quiz は選択式。
// code 内の C# 文字列補間 ( $"{x}" ) は JS テンプレートリテラルと衝突するため \${ とエスケープしている。

// ---- レベルチェック（最初のアンケート/クイズ） ----
// コードの読み書きだけでなく、コンパイルの仕組み・型の意味・オブジェクト指向の考え方も混ぜて、
// 実力に幅があっても開始位置が決まるようにしている。
window.PLACEMENT = [
  {
    q: "Console.WriteLine(\"Hi\"); は何をする？",
    options: ["Hi と表示する", "Hi をファイルに保存する", "Hi を消す", "エラーになる"],
    answer: 0
  },
  {
    q: "整数（例: 42）を入れるのに使う型は？",
    options: ["int", "string", "bool", "char"],
    answer: 0
  },
  {
    q: "C# のコードが実行されるまでに起きることは？",
    options: ["コンパイルされてから実行される", "1行ずつそのまま解釈される", "HTML に変換される", "自動で C++ になる"],
    answer: 0,
    explain: "C# はコンパイル言語。.NET が扱える形に変換されてから実行されます。"
  },
  {
    q: "この結果は？",
    code: "Console.WriteLine(7 / 2);",
    options: ["3", "3.5", "4", "エラーになる"],
    answer: 0
  },
  {
    q: "型を書く（静的型付け）ことの利点は？",
    options: ["間違いを実行前に見つけやすい", "実行が必ず速くなる", "型を書かなくてよくなる", "コードが必ず短くなる"],
    answer: 0,
    explain: "「この箱には数値しか入らない」と決めておけるので、間違いを早く見つけられます。"
  },
  {
    q: "この表示は？",
    code: "for (int i = 0; i < 3; i++)\n    Console.WriteLine(i);",
    options: ["0 1 2", "1 2 3", "0 1 2 3", "3 2 1"],
    answer: 0
  },
  {
    q: "クラスとオブジェクトの関係として正しいのは？",
    options: ["クラスは設計図、オブジェクトはそれから作った実体", "クラスは実体、オブジェクトは設計図", "どちらも同じもの", "クラスは変数の別名"],
    answer: 0,
    explain: "設計図（クラス）から new で実体（オブジェクト）を作ります。"
  },
  {
    q: "「継承」とは？",
    options: ["既存のクラスの性質を引き継いで新しいクラスを作る", "同じ処理をコピーする", "変数を共有する", "オブジェクトを削除する"],
    answer: 0,
    explain: "共通部分を親クラスにまとめ、子クラスが引き継ぎます。"
  },
  {
    q: "private やカプセル化の目的は？",
    options: ["外から勝手に触られないようにする", "実行を速くする", "メモリを減らす", "名前を短くする"],
    answer: 0
  },
  {
    q: "new で作ったオブジェクトのメモリを自動で片付ける仕組みは？",
    options: ["ガベージコレクション", "コンパイル", "リファクタリング", "インタプリタ"],
    answer: 0
  }
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
      <p>C#（シーシャープ）は Microsoft が作った<strong>静的型付け</strong>のオブジェクト指向言語です。ゲーム（Unity）・Web（ASP.NET）・業務システムなどで広く使われています。</p>
      <ul>
        <li><strong>.NET</strong> という実行環境の上で動く</li>
        <li>書いたコードは<strong>コンパイル</strong>されてから実行される</li>
        <li>型が決まっているので、間違いを早い段階で見つけられる</li>
      </ul>`,
    code: `// これが C# のコード
Console.WriteLine("Hello, C#!");`,
    questions: [
      { q: "C# のコードは、実行される前にどうなる？", options: ["そのまま1行ずつ実行される", "コンパイルされて機械が扱える形になる", "HTML に変換される", "自動で Python になる"], answer: 1, explain: "C# はコンパイル言語。書いたコードは .NET が扱える形に変換されてから実行されます。" },
      { q: ".NET とは？", options: ["C# を動かす実行環境", "C# の別名", "OS の名前", "エディタの名前"], answer: 0, explain: "C# のコードは .NET という実行環境の上で動きます。" },
      { q: "C# のソースファイルの拡張子は？", options: [".cs", ".c#", ".csx", ".sharp"], answer: 0 },
      { q: "C# が使われている例として近いのは？", options: ["Unity のゲーム開発", "HTML のタグ", "Photoshop のフィルタ専用", "Excel の数式"], answer: 0 }
    ]
  },

  {
    id: "hello",
    section: "はじめの一歩",
    title: "最初のプログラム",
    body: `
      <p>実行の入口が <code>Main</code> メソッドです。ここから上から順に処理が進みます。<code>Console.WriteLine</code> は「1行表示して改行」、<code>Console.Write</code> は改行しません。</p>`,
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
      { q: "Console.WriteLine(\"A\"); の直後に Console.Write(\"B\"); を実行すると？", options: ["A で改行され、次の行に B", "A B と1行で出る", "AB と1行で出る", "B で改行され、次の行に A"], answer: 0, explain: "WriteLine は改行、Write は改行しません。" }
    ]
  },

  {
    id: "vars",
    section: "値と型",
    title: "変数と型",
    body: `
      <p>値を入れておく箱が<strong>変数</strong>で、箱の種類が<strong>型</strong>です。</p>
      <ul>
        <li><code>int</code> 整数 / <code>double</code> 小数 / <code>string</code> 文字列 / <code>bool</code> true・false</li>
        <li><code>var</code> は右辺から型を<strong>推論</strong>してくれる</li>
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
      { q: "int x = 5; の後に x = \"hi\"; と書くと？", options: ["エラーになる", "x が hi になる", "x が 0 になる", "hi が数値になる"], answer: 0, explain: "int の箱に文字列は入れられません。型が合わないとコンパイルエラーです。" },
      { q: "string name = ...; に代入できないのは？", options: ["42", "\"abc\"", "\"こんにちは\"", "\"\""], answer: 0 }
    ]
  },

  {
    id: "interp",
    section: "値と型",
    title: "文字列と補間",
    body: `
      <p>文字列は <code>+</code> でつなげられますが、<code>$"..."</code> の<strong>文字列補間</strong>を使うと変数を埋め込めて読みやすくなります。</p>
      <p><code>.Length</code> は文字数を返します。</p>`,
    code: `string name = "Kanon";
int n = 3;

Console.WriteLine("Hi " + name);         // Hi Kanon
Console.WriteLine($"Hi {name}, {n}人");  // Hi Kanon, 3人
Console.WriteLine(name.Length);          // 5`,
    questions: [
      { q: "int x = 2; のとき、Console.WriteLine($\"xは{x}です\"); の表示は？", code: `int x = 2;\nConsole.WriteLine($"xは{x}です");`, options: ["xは2です", "xは{x}です", "xはxです", "エラーになる"], answer: 0, explain: "{ } の中は式として評価され、値が埋め込まれます。" },
      { q: "name.Length が表すものは？", options: ["文字数", "文字列の中身", "改行コード", "型の名前"], answer: 0 },
      { q: "文字列の連結に使う演算子は？", options: ["+", "&", ".", "*"], answer: 0 },
      { q: "\"abc\".Length の値は？", options: ["3", "abc", "0", "エラーになる"], answer: 0 }
    ]
  },

  {
    id: "numbers",
    section: "値と型",
    title: "計算と演算子",
    body: `
      <p><code>+ - * / %</code> が使えます。<strong>整数同士の割り算は整数</strong>になり、小数点以下は切り捨てられる点が要注意。</p>`,
    code: `Console.WriteLine(7 + 3);   // 10
Console.WriteLine(7 / 2);   // 3   ← 整数の割り算！
Console.WriteLine(7 % 2);   // 1
Console.WriteLine(7.0 / 2); // 3.5

int c = 0;
c++;                        // 1 増える`,
    questions: [
      { q: "Console.WriteLine(7 / 2); の結果は？", options: ["3", "3.5", "4", "エラーになる"], answer: 0, explain: "int 同士の割り算は整数。小数点以下は切り捨て。" },
      { q: "Console.WriteLine(10 % 3); の結果は？", options: ["1", "3", "3.33", "0"], answer: 0, explain: "% は余り。10 を 3 で割った余りは 1。" },
      { q: "余りを求める演算子は？", options: ["%", "/", "*", "#"], answer: 0 },
      { q: "int x = 5; のとき Console.WriteLine(x * 2 + 1); の結果は？", options: ["11", "12", "10", "51"], answer: 0, explain: "かけ算が先に計算されます（5×2+1=11）。" }
    ]
  },

  {
    id: "if",
    section: "制御",
    title: "条件分岐 if / else",
    body: `
      <p>条件が成り立つときだけ処理を実行します。比較は <code>&gt; &gt;= &lt; &lt;= == !=</code>。</p>
      <ul>
        <li><code>&amp;&amp;</code> かつ / <code>||</code> または / <code>!</code> 否定</li>
        <li>上から順に見て、最初に当てはまった所だけ実行される</li>
      </ul>`,
    code: `int score = 75;

if (score >= 80)
    Console.WriteLine("優");
else if (score >= 60)
    Console.WriteLine("良");
else
    Console.WriteLine("不可");`,
    questions: [
      { q: "score = 75 のとき、表示されるのは？", options: ["良", "優", "不可", "何も表示されない"], answer: 0, explain: "80 以上ではないので次の条件へ。60 以上なので「良」。" },
      { q: "「a かつ b」を表す書き方は？", options: ["a && b", "a || b", "a !b", "a and b"], answer: 0, explain: "&& が AND、|| が OR、! が NOT。" },
      { q: "値が等しいかどうかを比べる演算子は？", options: ["==", "=", "===", "!="], answer: 0, explain: "= は代入、== が比較です。" },
      { q: "int a = 1, b = 2; のとき、if (a > b) の条件は？", options: ["false（else 側が実行される）", "true", "エラーになる", "両方実行される"], answer: 0 }
    ]
  },

  {
    id: "switch",
    section: "制御",
    title: "switch 文",
    body: `
      <p>値によって処理を分けるときに使います。<strong>各 case の最後に <code>break;</code> を書く</strong>のが基本です。</p>
      <p class="note">break を忘れると、次の case の処理まで続けて実行されてしまいます。</p>`,
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
      { q: "どの case にも当てはまらないときに実行されるのは？", options: ["default", "else", "finally", "catch"], answer: 0 },
      { q: "case の最後に break; を書くのを忘れると？", options: ["次の case の処理まで流れ込む", "必ずエラーになる", "何も起きない", "default が消える"], answer: 0 },
      { q: "switch の対象としてよく使う型は？", options: ["int や string", "画像データ", "ファイル", "クラス定義"], answer: 0 }
    ]
  },

  {
    id: "loops",
    section: "制御",
    title: "繰り返し for / while",
    body: `
      <p><code>for</code> は「回数を決めて」、<code>while</code> は「条件が成り立つ間」繰り返します。</p>
      <ul>
        <li><code>for (初期化; 条件; 更新)</code></li>
        <li>while は条件を自分で false にしないと<strong>無限ループ</strong>になる</li>
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
      { q: "int s = 0; for (int i = 1; i <= 3; i++) s += i; のあと s は？", options: ["6", "3", "9", "1"], answer: 0, explain: "1+2+3 で 6 になります（s += i は s = s + i）。" }
    ]
  },

  {
    id: "arrays",
    section: "データ",
    title: "配列と List",
    body: `
      <p>複数の値をまとめて扱います。<strong>添字は 0 から</strong>。</p>
      <ul>
        <li><code>int[]</code> … 個数を後から変えられない配列</li>
        <li><code>List&lt;int&gt;</code> … <code>Add</code> などで増やせる。個数は <code>Count</code></li>
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
      { q: "List に要素を追加するメソッドは？", options: ["Add", "Push", "Append", "InsertEnd"], answer: 0 }
    ]
  },

  {
    id: "methods",
    section: "データ",
    title: "メソッド（関数）",
    body: `
      <p>処理に名前を付けてまとめたものが<strong>メソッド</strong>です。引数を受け取り、<code>return</code> で値を返します。</p>
      <ul>
        <li><code>int Add(int a, int b)</code> … int を2つ受け取り int を返す</li>
        <li><code>void</code> … 戻り値が無いという意味</li>
      </ul>`,
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
      { q: "同じ処理をメソッドにまとめる利点は？", options: ["何度も書かずに再利用できる", "実行が必ず速くなる", "型を書かなくてよくなる", "変数が消える"], answer: 0 }
    ]
  },

  {
    id: "classes",
    section: "オブジェクト指向",
    title: "クラスとオブジェクト",
    body: `
      <p>データと処理をひとまとめにした設計図が<strong>クラス</strong>、そこから作った実体が<strong>オブジェクト</strong>です。<code>new</code> で作ります。</p>`,
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
      { q: "クラスからオブジェクトを作るキーワードは？", options: ["new", "make", "create", "object"], answer: 0 },
      { q: "クラスの中の変数（例: Name）を何と呼ぶ？", options: ["フィールド", "ローカル変数", "引数", "型"], answer: 0 }
    ]
  },

  {
    id: "props",
    section: "オブジェクト指向",
    title: "プロパティとカプセル化",
    body: `
      <p><code>{ get; set; }</code> の形を<strong>プロパティ</strong>と呼びます。<code>private set;</code> にすると、外からは読めるけど書き換えられなくなります（＝カプセル化）。</p>`,
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
      { q: "{ get; set; } の形を何と呼ぶ？", options: ["プロパティ", "メソッド", "フィールド", "コンストラクタ"], answer: 0 },
      { q: "外から勝手に書き換えられないようにすることを？", options: ["カプセル化", "継承", "抽象化", "多態性"], answer: 0 }
    ]
  },

  {
    id: "linq",
    section: "一歩先",
    title: "LINQ でコレクション操作",
    body: `
      <p>リストなどに対して「絞り込み・変換・集計」をメソッドチェーンで書けます。</p>
      <ul>
        <li><code>Where</code> 条件に合うものだけ残す / <code>Select</code> 変換する / <code>Count</code> 数える</li>
      </ul>
      <p class="note"><code>n =&gt; n % 2 == 0</code> は「n を受け取って偶数かどうかを返す」小さな関数です。</p>`,
    code: `var nums = new List<int> { 1, 2, 3, 4, 5, 6 };

var evens   = nums.Where(n => n % 2 == 0);  // 2, 4, 6
var doubled = nums.Select(n => n * 2);      // 2, 4, 6, 8, 10, 12

Console.WriteLine(nums.Count(n => n > 3)); // 3`,
    questions: [
      { q: "nums.Where(n => n % 2 == 0) が残すのは？", options: ["偶数だけ", "奇数だけ", "すべて", "何も残らない"], answer: 0 },
      { q: "nums.Count(n => n > 3) の結果は？", options: ["3", "4", "6", "0"], answer: 0, explain: "3 より大きいのは 4, 5, 6 の3つ。" },
      { q: "それぞれの要素を変換したいときに使うのは？", options: ["Select", "Where", "Count", "OrderBy"], answer: 0 },
      { q: "n => n * 2 の n は何を表す？", options: ["各要素", "リスト全体", "インデックス", "型名"], answer: 0 }
    ]
  },

  {
    id: "exceptions",
    section: "一歩先",
    title: "例外処理 try / catch",
    body: `
      <p>エラーが起きたときは<strong>例外</strong>が投げられます。放っておくとプログラムはそこで止まります。<code>try / catch</code> で受け止めれば、続行できます。</p>`,
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
      { q: "catch (FormatException) が捕まえるのは？", options: ["書式エラーの例外", "ゼロ除算の例外", "ファイル未検出の例外", "すべての例外"], answer: 0 }
    ]
  }
];
