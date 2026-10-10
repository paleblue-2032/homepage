// アドバンス編。lessons.js の後に読み込んで LESSONS に追加する。
// 本文中のコードは <pre class="code" data-code> でハイライトされる。
(window.LESSONS = window.LESSONS || []).push(
  // ---------- 値と型 ----------
  {
    id: "strings",
    section: "値と型",
    title: "文字列の便利メソッド",
    body: `
      <p>文字列には最初から便利なメソッドがたくさん用意されています。自分でループを書かなくても、多くの操作が1行で書けます。</p>

      <h3>よく使うメソッド</h3>
      <table>
        <tr><th>メソッド</th><th>やること</th></tr>
        <tr><td>Contains("x")</td><td>含まれているか</td></tr>
        <tr><td>StartsWith / EndsWith</td><td>先頭 / 末尾が一致するか</td></tr>
        <tr><td>Replace("a", "b")</td><td>置き換える</td></tr>
        <tr><td>Substring(start, len)</td><td>一部を取り出す</td></tr>
        <tr><td>ToUpper / ToLower</td><td>大文字 / 小文字にする</td></tr>
        <tr><td>Trim()</td><td>前後の空白を除く</td></tr>
        <tr><td>Split(',')</td><td>区切りで分割して配列にする</td></tr>
      </table>

      <h3>例</h3>
      <pre class="code" data-code>string s = "  Hello, World  ";

Console.WriteLine(s.Trim());              // "Hello, World"
Console.WriteLine(s.Contains("World"));   // True
Console.WriteLine(s.Trim().ToUpper());    // "HELLO, WORLD"
Console.WriteLine(s.Replace("World", "C#"));  // "  Hello, C#  "</pre>

      <h3>分割と結合</h3>
      <pre class="code" data-code>string csv = "red,green,blue";
string[] parts = csv.Split(',');          // ["red","green","blue"]
string back = string.Join("-", parts);    // "red-green-blue"</pre>

      <h3>文字列は変更できない</h3>
      <p><code>Replace</code> などを呼んでも元の文字列は変わりません。<strong>新しい文字列が返ってくる</strong>ので、結果を受け取る必要があります。</p>
      <pre class="code" data-code>string a = "abc";
a.Replace("a", "x");   // 戻り値を捨てている → a は "abc" のまま
string b = a.Replace("a", "x");  // b が "xbc"</pre>`,
    code: `string s = "  Hello, World  ";

Console.WriteLine(s.Trim());              // Hello, World
Console.WriteLine(s.Contains("World"));   // True
Console.WriteLine(s.Trim().ToUpper());    // HELLO, WORLD`,
    questions: [
      { q: "\"Hello\".Contains(\"ell\") の結果は？", options: ["true", "false", "3", "エラーになる"], answer: 0, explain: "\"Hello\" には \"ell\" が含まれるので true。" },
      { q: "\"abc\".ToUpper() の結果は？", options: ["\"ABC\"", "\"abc\"", "\"Abc\"", "エラーになる"], answer: 0 },
      { q: "\"red,green\".Split(',') の結果は？", options: ["[\"red\", \"green\"]", "\"red green\"", "2", "\"red,green\""], answer: 0, explain: "区切り文字で分割した配列が返ります。" },
      { q: "s.Replace(...) を呼んでも元の文字列が変わらないのはなぜ？", options: ["文字列は変更不可で、新しい文字列が返るから", "Replace は何もしないから", "型が違うから", "参照が消えるから"], answer: 0 },
      { q: "前後の空白を取り除くメソッドは？", options: ["Trim", "Clear", "Cut", "Remove"], answer: 0 },
      { type: "input", q: "文字列を大文字に変換するメソッド名を英字で入力してください", answers: ["toupper"], explain: "ToUpper です。" }
    ]
  },

  {
    id: "enum",
    section: "値と型",
    title: "enum（列挙型）",
    body: `
      <p>決まった選択肢だけを扱いたいときは <code>enum</code> を使います。「赤・黄・青」のように、取りうる値を名前で表せます。</p>

      <h3>定義と使用</h3>
      <pre class="code" data-code>enum Color { Red, Yellow, Blue }

Color c = Color.Red;
Console.WriteLine(c);          // Red</pre>
      <p>名前の裏側では 0 から順に番号が振られます（Red=0, Yellow=1, Blue=2）。</p>
      <pre class="code" data-code>Console.WriteLine((int)Color.Blue);   // 2</pre>

      <h3>数値より安全</h3>
      <p>ただの int だと <code>99</code> のような変な値も入ってしまいますが、enum は定義した名前しか使えないので間違いを防げます。</p>
      <pre class="code" data-code>Color c = 99;   // これは書けない（明示的な変換が必要）</pre>

      <h3>switch と相性が良い</h3>
      <pre class="code" data-code>switch (c)
{
    case Color.Red:    Console.WriteLine("止まれ"); break;
    case Color.Yellow: Console.WriteLine("注意");   break;
    case Color.Blue:   Console.WriteLine("進め");   break;
}</pre>`,
    code: `enum Color { Red, Yellow, Blue }

Color c = Color.Red;
Console.WriteLine(c);              // Red
Console.WriteLine((int)Color.Blue); // 2`,
    questions: [
      { q: "enum を定義するキーワードは？", options: ["enum", "list", "set", "struct"], answer: 0 },
      { q: "enum Color { Red, Yellow, Blue } で Yellow の番号は？", options: ["1", "0", "2", "3"], answer: 0, explain: "0 から順に振られるので Red=0, Yellow=1, Blue=2。" },
      { q: "enum を使う利点は？", options: ["決まった名前しか使えず、間違いを防げる", "実行が必ず速くなる", "メモリが減る", "数値が使えなくなる"], answer: 0 },
      { q: "(int)Color.Blue の結果は？", options: ["2", "Blue", "1", "エラーになる"], answer: 0 },
      { q: "enum と特に相性が良い構文は？", options: ["switch", "for", "try", "using"], answer: 0 },
      { type: "input", q: "列挙型を定義するキーワードを英字で入力してください", answers: ["enum"], explain: "enum で定義します。" }
    ]
  },

  // ---------- データ ----------
  {
    id: "dictionary",
    section: "データ",
    title: "Dictionary（キーと値）",
    body: `
      <p><code>List</code> は番号（0,1,2…）で取り出しますが、<strong>名前などのキー</strong>で取り出したいときは <code>Dictionary</code> を使います。</p>

      <h3>基本</h3>
      <pre class="code" data-code>var scores = new Dictionary<string, int>();
scores["taro"] = 80;          // 追加（キー: 値）
scores["hanako"] = 95;

Console.WriteLine(scores["taro"]);   // 80
Console.WriteLine(scores.Count);     // 2</pre>
      <p><code>&lt;string, int&gt;</code> は「キーが string、値が int」という意味です。</p>

      <h3>存在しないキーに注意</h3>
      <p>ないキーで読むと例外になります。先に確認するか、安全に取り出すメソッドを使います。</p>
      <pre class="code" data-code>if (scores.ContainsKey("jiro"))
    Console.WriteLine(scores["jiro"]);

// 安全に取り出す（あれば true で値を返す）
if (scores.TryGetValue("jiro", out int v))
    Console.WriteLine(v);
else
    Console.WriteLine("未登録");</pre>

      <h3>全部を走査する</h3>
      <pre class="code" data-code>foreach (var pair in scores)
    Console.WriteLine($"{pair.Key}: {pair.Value}");</pre>

      <p class="note">同じキーで <code>Add</code> すると例外になります。上書きしたいときは <code>scores["key"] = ...</code> を使います。</p>`,
    code: `var scores = new Dictionary<string, int>();
scores["taro"] = 80;
scores["hanako"] = 95;

Console.WriteLine(scores["taro"]);   // 80
Console.WriteLine(scores.Count);     // 2`,
    questions: [
      { q: "Dictionary の <string, int> はどういう意味？", options: ["キーが string、値が int", "値が string、キーが int", "2つの int", "文字列の配列"], answer: 0 },
      { q: "存在しないキーで scores[\"x\"] を読むと？", options: ["例外になる", "0 が返る", "null が返る", "自動で追加される"], answer: 0 },
      { q: "キーが存在するか確認するメソッドは？", options: ["ContainsKey", "HasKey", "Exists", "Find"], answer: 0 },
      { q: "安全に値を取り出すメソッドは？", options: ["TryGetValue", "GetValue", "ReadValue", "FindValue"], answer: 0 },
      { q: "同じキーで Add すると？", options: ["例外になる", "上書きされる", "無視される", "2つになる"], answer: 0 },
      { type: "input", q: "キーと値を扱うコレクションの名前を英字で入力してください", answers: ["dictionary"], explain: "Dictionary です。" }
    ]
  },

  {
    id: "generics",
    section: "データ",
    title: "ジェネリクス（型引数）",
    body: `
      <p><code>List&lt;int&gt;</code> の <code>&lt;int&gt;</code> のように、使う型を後から指定できる仕組みが<strong>ジェネリクス</strong>です。</p>

      <h3>なぜ必要か</h3>
      <p>昔は何でも入る型（object）を使っていましたが、取り出すたびに変換が必要で、間違いも起きやすかった。ジェネリクスなら「int 専用のリスト」になり、<strong>型が保証</strong>されます。</p>
      <pre class="code" data-code>var nums = new List<int>();
nums.Add(10);
nums.Add("abc");   // エラー！ int 専用なのでコンパイル時に分かる</pre>

      <h3>自分でも作れる（ジェネリックメソッド）</h3>
      <p><code>T</code> は「あとで決まる型」の置き手紙のようなものです。</p>
      <pre class="code" data-code>static T First&lt;T&gt;(List&lt;T&gt; list)
{
    return list[0];
}

int a = First(new List&lt;int&gt; { 5, 6 });        // 5
string b = First(new List&lt;string&gt; { "x" });  // "x"</pre>

      <h3>ポイント</h3>
      <ul>
        <li>呼び出し側で型を決められるので、型ごとに同じコードを書かなくて済む</li>
        <li>コンパイル時に型チェックされるので安全</li>
      </ul>`,
    code: `var nums = new List<int> { 1, 2, 3 };
// nums.Add("abc");   // エラー：int 専用

static T First<T>(List<T> list) { return list[0]; }
Console.WriteLine(First(nums));   // 1`,
    questions: [
      { q: "List<int> の <int> は何を表す？", options: ["扱う要素の型", "要素の数", "リストの名前", "初期値"], answer: 0 },
      { q: "ジェネリクスを使う利点は？", options: ["型が保証され、間違いをコンパイル時に見つけられる", "実行が必ず速くなる", "どんな型でも入る", "メモリが減る"], answer: 0 },
      { q: "ジェネリックメソッドで型を表すのによく使う文字は？", options: ["T", "X", "V", "N"], answer: 0 },
      { q: "「あとで決まる型」を使って定義したメソッドを何という？", options: ["ジェネリックメソッド", "オーバーロード", "コンストラクタ", "ラムダ式"], answer: 0 },
      { q: "List<int> に string を Add しようとすると？", options: ["コンパイルエラーになる", "実行時に消える", "自動で変換される", "そのまま入る"], answer: 0 },
      { type: "input", q: "List のように「使う型を後から指定できる」仕組みを何という？（カタカナで）", answers: ["ジェネリクス", "ジェネリック"], explain: "ジェネリクス（総称型）です。" }
    ]
  },

  {
    id: "lambda",
    section: "データ",
    title: "ラムダ式とデリゲート",
    body: `
      <p>「処理そのもの」を値として渡せるのが<strong>ラムダ式</strong>です。LINQ の <code>n =&gt; n * 2</code> もラムダ式です。</p>

      <h3>形</h3>
      <p><code>引数 =&gt; 式</code> の形で書きます。複数の文を書くときは <code>{ }</code> で囲みます。</p>
      <pre class="code" data-code>x => x * 2            // 引数1つ、式1つ
(x, y) => x + y       // 引数2つ
() => Console.WriteLine("hi")   // 引数なし</pre>

      <h3>型は Func と Action</h3>
      <ul>
        <li><code>Func&lt;引数..., 戻り値&gt;</code> … 値を返す</li>
        <li><code>Action&lt;引数...&gt;</code> … 値を返さない（void）</li>
      </ul>
      <pre class="code" data-code>Func<int, int> doubleIt = x => x * 2;
Console.WriteLine(doubleIt(5));    // 10

Action<string> greet = name => Console.WriteLine($"Hi {name}");
greet("Kanon");                    // Hi Kanon</pre>

      <h3>メソッドに渡す</h3>
      <p>「何をするか」を引数で受け取れるので、汎用的なメソッドが作れます。</p>
      <pre class="code" data-code>static int Apply(int x, Func<int, int> f) => f(x);

Console.WriteLine(Apply(5, x => x + 1));   // 6
Console.WriteLine(Apply(5, x => x * x));   // 25</pre>`,
    code: `Func<int, int> doubleIt = x => x * 2;
Console.WriteLine(doubleIt(5));       // 10

Action<string> greet = name => Console.WriteLine($"Hi {name}");
greet("Kanon");                       // Hi Kanon`,
    questions: [
      { q: "x => x * 2 のような書き方を何という？", options: ["ラムダ式", "コンストラクタ", "プロパティ", "名前空間"], answer: 0 },
      { q: "値を返す関数を表す型は？", options: ["Func", "Action", "void", "Task"], answer: 0 },
      { q: "戻り値のない処理を表す型は？", options: ["Action", "Func", "int", "bool"], answer: 0 },
      { q: "(x, y) => x + y の引数の数は？", options: ["2つ", "1つ", "0", "3つ"], answer: 0 },
      { q: "ラムダ式を使うと何ができる？", options: ["処理そのものを値として渡せる", "型を書かなくてよくなる", "実行が必ず速くなる", "変数が消える"], answer: 0 },
      { type: "input", q: "ラムダ式で「引数」と「本体」をつなぐ記号を2文字で入力してください", answers: ["=>", "＝＞"], explain: "=> です（アロー演算子）。" }
    ]
  },

  // ---------- オブジェクト指向 ----------
  {
    id: "inherit",
    section: "オブジェクト指向",
    title: "継承とポリモーフィズム",
    body: `
      <p>共通する部分を親クラスにまとめ、子クラスが引き継ぐのが<strong>継承</strong>です。重複を減らし、共通の扱いができます。</p>

      <h3>継承の書き方</h3>
      <p><code>:</code> を使って「子 : 親」と書きます。</p>
      <pre class="code" data-code>class Animal
{
    public string Name;
    public virtual void Speak() => Console.WriteLine("...");
}

class Dog : Animal
{
    public override void Speak() => Console.WriteLine($"{Name}: ワン!");
}

class Cat : Animal
{
    public override void Speak() => Console.WriteLine($"{Name}: ニャー");
}</pre>
      <p><code>virtual</code> は「子で上書きしてよい」、<code>override</code> は「親のを上書きする」という印です。</p>

      <h3>ポリモーフィズム（多態性）</h3>
      <p>親の型でまとめて扱っても、実際のオブジェクトに応じた動きになります。</p>
      <pre class="code" data-code>var animals = new List&lt;Animal&gt; { new Dog(), new Cat() };
animals[0].Name = "ポチ";
animals[1].Name = "ミケ";

foreach (var a in animals)
    a.Speak();     // ポチ: ワン! / ミケ: ニャー</pre>

      <p class="note">共通の親でまとめられるので、「動物たちを順番に鳴らす」といった処理を1回書くだけで済みます。</p>`,
    code: `class Animal
{
    public string Name;
    public virtual void Speak() => Console.WriteLine("...");
}

class Dog : Animal
{
    public override void Speak() => Console.WriteLine($"{Name}: ワン!");
}

var d = new Dog { Name = "ポチ" };
d.Speak();   // ポチ: ワン!`,
    questions: [
      { q: "class Dog : Animal の「: Animal」は何を表す？", options: ["Animal を継承する", "Animal を削除する", "Animal と比較する", "Animal をコピーする"], answer: 0 },
      { q: "親のメソッドを子で上書きするときに付けるキーワードは？", options: ["override", "virtual", "static", "new"], answer: 0 },
      { q: "「子で上書きしてよい」と親側で示すキーワードは？", options: ["virtual", "override", "abstract", "base"], answer: 0 },
      { q: "親の型でまとめて扱っても実際の型に応じて動く性質を何という？", options: ["ポリモーフィズム（多態性）", "カプセル化", "オーバーロード", "ジェネリクス"], answer: 0 },
      { q: "継承の主な利点は？", options: ["共通部分をまとめて重複を減らせる", "実行が必ず速くなる", "メモリが減る", "型を書かなくてよくなる"], answer: 0 },
      { type: "input", q: "親のメソッドを子で上書きするときに付けるキーワードを英字で入力してください", answers: ["override"], explain: "override です。" }
    ]
  },

  {
    id: "interface",
    section: "オブジェクト指向",
    title: "インターフェース",
    body: `
      <p><strong>インターフェース</strong>は「こういうメソッドを持っています」という<strong>約束</strong>だけを決めたものです。実装は持ちません。</p>

      <h3>定義と実装</h3>
      <pre class="code" data-code>interface IShape
{
    double Area();      // 中身は書かない（約束だけ）
}

class Square : IShape
{
    public double Size { get; set; }
    public double Area() => Size * Size;   // 中身を実装する
}

class Circle : IShape
{
    public double Radius { get; set; }
    public double Area() => 3.14 * Radius * Radius;
}</pre>

      <h3>約束で扱える</h3>
      <p>インターフェースの型でまとめれば、中身が違っても同じように呼べます。</p>
      <pre class="code" data-code>var shapes = new List&lt;IShape&gt; { new Square { Size = 3 }, new Circle { Radius = 2 } };
foreach (var s in shapes)
    Console.WriteLine(s.Area());</pre>

      <h3>継承との違い</h3>
      <ul>
        <li>クラスの継承は1つだけ。インターフェースは<strong>複数</strong>実装できる</li>
        <li>「〜である」(継承) と「〜できる」(インターフェース) で使い分ける</li>
      </ul>`,
    code: `interface IShape { double Area(); }

class Square : IShape
{
    public double Size { get; set; }
    public double Area() => Size * Size;
}

Console.WriteLine(new Square { Size = 3 }.Area());   // 9`,
    questions: [
      { q: "インターフェースが表すのは？", options: ["メソッドの約束（シグネチャ）", "実際の処理の中身", "変数の初期値", "実行速度"], answer: 0 },
      { q: "インターフェースを持たせる書き方は？", options: ["class Square : IShape", "class Square extends IShape", "class Square(IShape)", "interface Square = IShape"], answer: 0 },
      { q: "クラスの継承と違って、インターフェースは？", options: ["複数実装できる", "1つだけ", "継承できない", "変数を持てない"], answer: 0 },
      { q: "インターフェースのメソッドに処理の中身は書ける？", options: ["書かない（実装側が書く）", "必ず書く", "数値だけ書く", "コメントだけ書く"], answer: 0 },
      { q: "「〜できる」という能力を表すのに向いているのは？", options: ["インターフェース", "クラス継承", "コンストラクタ", "enum"], answer: 0 },
      { type: "input", q: "インターフェースの名前は、慣習として先頭に何を付ける？（英字1文字）", answers: ["i"], explain: "慣習として IShape のように先頭に I を付けます。" }
    ]
  },

  {
    id: "static",
    section: "オブジェクト指向",
    title: "static とインスタンス",
    body: `
      <p><code>static</code> が付いたメンバーは<strong>インスタンスを作らずに</strong>使えます。付いていなければ、オブジェクト（インスタンス）を作ってから使います。</p>

      <h3>static の例</h3>
      <pre class="code" data-code>class MathUtil
{
    public static int Double(int x) => x * 2;
}

// new しなくてよい
Console.WriteLine(MathUtil.Double(5));   // 10</pre>
      <p>いままで書いてきた <code>Main</code> や、<code>Console.WriteLine</code> も static です。</p>

      <h3>インスタンス（static でない）の例</h3>
      <pre class="code" data-code>class Counter
{
    public int Value = 0;
    public void Inc() => Value++;    // インスタンスごとの Value
}

var a = new Counter();
var b = new Counter();
a.Inc();
Console.WriteLine(a.Value);   // 1
Console.WriteLine(b.Value);   // 0（別々に持つ）</pre>

      <h3>使い分け</h3>
      <ul>
        <li>状態（値）を持たない便利関数 → static でよい</li>
        <li>オブジェクトごとに値を持つ → インスタンスメンバー</li>
      </ul>
      <p class="note">static なメンバーからは、インスタンスメンバーに直接アクセスできません。</p>`,
    code: `class MathUtil
{
    public static int Double(int x) => x * 2;
}

Console.WriteLine(MathUtil.Double(5));   // 10`,
    questions: [
      { q: "static なメソッドを呼ぶのに必要なものは？", options: ["インスタンスは不要（クラス名で呼べる）", "必ず new する", "変数に代入する", "コンストラクタ"], answer: 0 },
      { q: "Console.WriteLine は static か？", options: ["static である", "インスタンスが必要", "どちらでもない", "enum である"], answer: 0 },
      { q: "インスタンスごとに別々の値を持つのに使うのは？", options: ["インスタンスメンバー", "static メンバー", "enum", "const"], answer: 0 },
      { q: "Main メソッドに static が付いているのはなぜ？", options: ["オブジェクトを作る前に呼ばれるから", "速くするため", "型を消すため", "見た目のため"], answer: 0 },
      { q: "static なメンバーからインスタンスメンバーに直接アクセスできる？", options: ["できない", "できる", "数値だけできる", "常に可能"], answer: 0 },
      { type: "input", q: "インスタンスを作らずに使えるメンバーに付けるキーワードを英字で入力してください", answers: ["static"], explain: "static です。" }
    ]
  },

  {
    id: "valuetype",
    section: "オブジェクト指向",
    title: "値型と参照型",
    body: `
      <p>C# の型は大きく<strong>値型</strong>と<strong>参照型</strong>に分かれます。代入したときの動きが違います。</p>

      <h3>値型はコピーされる</h3>
      <p><code>int</code> や <code>double</code>、<code>struct</code> は<strong>値型</strong>です。代入すると中身がコピーされ、片方を変えてももう片方は変わりません。</p>
      <pre class="code" data-code>int a = 10;
int b = a;      // 値をコピー
b = 20;
Console.WriteLine(a);   // 10 のまま</pre>

      <h3>参照型は同じものを指す</h3>
      <p>クラス（<code>class</code>）のオブジェクトや配列は<strong>参照型</strong>です。代入すると「同じものを指す」状態になります。</p>
      <pre class="code" data-code>var p1 = new Person { Name = "A" };
var p2 = p1;            // 同じオブジェクトを指す
p2.Name = "B";
Console.WriteLine(p1.Name);   // B（p1 も変わる）</pre>

      <h3>struct という値型のクラス</h3>
      <p><code>struct</code> を使うと、自分でも値型を作れます。小さいデータ（座標など）に向きます。</p>
      <pre class="code" data-code>struct Point { public int X; public int Y; }

var q1 = new Point { X = 1, Y = 2 };
var q2 = q1;            // コピー
q2.X = 99;
Console.WriteLine(q1.X);   // 1 のまま</pre>

      <p class="note">値型は <code>null</code> になれません。参照型は <code>null</code> になり得ます。</p>`,
    code: `int a = 10;
int b = a;
b = 20;
Console.WriteLine(a);   // 10（値型はコピー）`,
    questions: [
      { q: "int や struct のように、代入で中身がコピーされる型を？", options: ["値型", "参照型", "動的型", "匿名型"], answer: 0 },
      { q: "クラスのオブジェクトを代入すると？", options: ["同じものを指す（参照がコピーされる）", "中身が丸ごとコピーされる", "エラーになる", "null になる"], answer: 0 },
      { q: "小さいデータ向けの値型を作るキーワードは？", options: ["struct", "class", "interface", "enum"], answer: 0 },
      { q: "null になれるのは？", options: ["参照型", "値型", "どちらもならない", "enum だけ"], answer: 0 },
      { q: "var p2 = p1;（p1 はクラス）の後で p2 を変えると？", options: ["p1 も変わる", "p1 は変わらない", "エラーになる", "p2 だけコピーされる"], answer: 0 },
      { type: "input", q: "代入で中身がコピーされる型を何型という？（漢字2文字）", answers: ["値型", "値"], explain: "値型です。" }
    ]
  },

  // ---------- 一歩先 ----------
  {
    id: "nullsafe",
    section: "一歩先",
    title: "null と安全な扱い",
    body: `
      <p><code>null</code> は「何も指していない」状態です。参照型は null になり得るので、うっかり触るとエラーになります。</p>

      <h3>よくあるエラー</h3>
      <pre class="code" data-code>string s = null;
Console.WriteLine(s.Length);   // NullReferenceException！</pre>
      <p>null に対して <code>.</code> でアクセスすると例外で止まります。これが「ヌル参照」のエラーです。</p>

      <h3>安全にアクセスする ?.</h3>
      <p><code>?.</code> は、左が null ならそこで止めて null を返します（例外にならない）。</p>
      <pre class="code" data-code>string s = null;
Console.WriteLine(s?.Length);   // 例外にならず空白

int? len = s?.Length;           // int? は「int かもしれないし null かもしれない」</pre>

      <h3>既定値を与える ??</h3>
      <p><code>??</code> は、左が null なら右を使います。</p>
      <pre class="code" data-code>string name = null;
string show = name ?? "名無し";   // "名無し"
name ??= "既定";                  // name が null なら代入</pre>

      <h3>null 許容の型</h3>
      <p><code>string?</code> のように <code>?</code> を付けると「null の可能性がある」と明示できます。付けなければ null を入れにくくなり、安全になります。</p>`,
    code: `string s = null;
Console.WriteLine(s?.Length);    // 例外にならず空
string show = s ?? "(なし)";     // "(なし)"`,
    questions: [
      { q: "null に対して . でアクセスすると？", options: ["NullReferenceException（例外）", "0 が返る", "空文字が返る", "自動で作られる"], answer: 0 },
      { q: "s?.Length の ?. は何をする？", options: ["null なら止めて null を返す（例外にしない）", "必ず例外にする", "長さを2倍にする", "null を消す"], answer: 0 },
      { q: "name ?? \"既定\" は？", options: ["name が null なら「既定」を使う", "name を消す", "name を2回使う", "必ず例外"], answer: 0 },
      { q: "null の可能性があることを表す型の書き方は？", options: ["string?", "string!", "?string", "string?"], answer: 0, explain: "型の後ろに ? を付けて string? と書きます。" },
      { q: "null が原因で起きる例外の名前は？", options: ["NullReferenceException", "FormatException", "DivideByZeroException", "ArgumentException"], answer: 0 },
      { type: "input", q: "「左が null なら右を使う」演算子を2文字で入力してください", answers: ["??"], explain: "?? です。" }
    ]
  },

  {
    id: "async",
    section: "一歩先",
    title: "async / await 入門",
    body: `
      <p>時間のかかる処理（通信・ファイル・待ち時間）をしている間、プログラムを止めない仕組みが<strong>非同期</strong>です。<code>async</code> と <code>await</code> で書きます。</p>

      <h3>なぜ必要か</h3>
      <p>重い処理をそのまま待つと、アプリの画面が固まったり、他の処理が進まなくなります。非同期なら<strong>待っている間に別のことができる</strong>ようになります。</p>

      <h3>書き方</h3>
      <pre class="code" data-code>async Task&lt;string&gt; FetchAsync()
{
    await Task.Delay(1000);        // 1秒待つ間、他の処理が進める
    return "完了";
}

string result = await FetchAsync();   // 結果が来たら受け取る</pre>

      <h3>戻り値の型</h3>
      <ul>
        <li><code>Task</code> … 値を返さない非同期処理</li>
        <li><code>Task&lt;T&gt;</code> … T を返す非同期処理</li>
      </ul>
      <p><code>await</code> は「結果が来るまで待つ」印で、待っている間はスレッドを占有しません。</p>

      <h3>ポイント</h3>
      <ul>
        <li><code>await</code> は <code>async</code> なメソッドの中で使う</li>
        <li>通信・ファイル・DB など「待ちが発生する処理」で使う</li>
        <li>戻り値を <code>Task</code> で包むのが基本</li>
      </ul>`,
    code: `async Task<string> FetchAsync()
{
    await Task.Delay(1000);   // 待っている間ほかの処理が進む
    return "完了";
}

string result = await FetchAsync();`,
    questions: [
      { q: "待ち時間の間にほかの処理を進められる仕組みは？", options: ["非同期処理", "同期的処理", "再帰", "継承"], answer: 0 },
      { q: "値を返さない非同期メソッドの戻り値の型は？", options: ["Task", "void が普通", "int", "string"], answer: 0, explain: "async メソッドは Task / Task<T> を返すのが基本です。" },
      { q: "結果が来るまで待つ印に使うキーワードは？", options: ["await", "async", "wait", "pause"], answer: 0 },
      { q: "await を使えるのはどんなメソッドの中？", options: ["async が付いたメソッド", "どこでも", "Main 以外", "static なメソッドのみ"], answer: 0 },
      { q: "非同期にすると何がうれしい？", options: ["待っている間も止まらずに進められる", "必ず速くなる", "メモリが減る", "型が不要になる"], answer: 0 },
      { type: "input", q: "「結果が来るまで待つ」印に使うキーワードを英字で入力してください", answers: ["await"], explain: "await です。" }
    ]
  },

  {
    id: "fileio",
    section: "一歩先",
    title: "ファイルの読み書き",
    body: `
      <p>ファイルの読み書きは <code>File</code> クラスで簡単にできます。まずは「丸ごと読む／丸ごと書く」から。</p>

      <h3>書き込みと読み込み</h3>
      <pre class="code" data-code>using System.IO;

File.WriteAllText("memo.txt", "こんにちは");   // ファイルに書く
string text = File.ReadAllText("memo.txt");    // 丸ごと読む
Console.WriteLine(text);                       // こんにちは</pre>

      <h3>行ごとに扱う</h3>
      <pre class="code" data-code>string[] lines = { "1行目", "2行目" };
File.WriteAllLines("memo.txt", lines);         // 行ごとに書く

foreach (string line in File.ReadAllLines("memo.txt"))
    Console.WriteLine(line);</pre>

      <h3>存在確認と注意</h3>
      <pre class="code" data-code>if (File.Exists("memo.txt"))
    Console.WriteLine("ある");</pre>
      <ul>
        <li>ファイルが無いのに読むと例外になる → <code>File.Exists</code> や try/catch で備える</li>
        <li>パスの区切りは環境で違うので、<code>Path.Combine("dir", "memo.txt")</code> を使うと安全</li>
      </ul>`,
    code: `using System.IO;

File.WriteAllText("memo.txt", "こんにちは");
string text = File.ReadAllText("memo.txt");
Console.WriteLine(text);   // こんにちは`,
    questions: [
      { q: "ファイルに文字列を丸ごと書き込むメソッドは？", options: ["File.WriteAllText", "File.ReadAllText", "File.Save", "Console.Write"], answer: 0 },
      { q: "ファイルを丸ごと読むメソッドは？", options: ["File.ReadAllText", "File.WriteAllText", "File.Open", "File.Load"], answer: 0 },
      { q: "ファイルが存在するか確認するメソッドは？", options: ["File.Exists", "File.Has", "File.Find", "File.Check"], answer: 0 },
      { q: "存在しないファイルを読むと？", options: ["例外になる", "空文字が返る", "新規作成される", "null が返る"], answer: 0 },
      { q: "行ごとにまとめて読むメソッドは？", options: ["File.ReadAllLines", "File.ReadAllText", "File.ReadLine", "File.Lines"], answer: 0 },
      { type: "input", q: "ファイルを丸ごと読むメソッド名を英字で入力してください（File. の後ろ）", answers: ["readalltext"], explain: "File.ReadAllText です。" }
    ]
  },

  {
    id: "modern",
    section: "一歩先",
    title: "モダンな C# の書き方",
    body: `
      <p>最近の C# には、コードを短く安全に書くための記法が増えています。よく使うものを紹介します。</p>

      <h3>switch 式</h3>
      <p>分岐を「値として」書けます。<code>_</code> は「その他」を表します。</p>
      <pre class="code" data-code>int n = 2;
string s = n switch
{
    1 => "one",
    2 => "two",
    _ => "other",
};</pre>

      <h3>record（データを表す型）</h3>
      <p>データの入れ物に向いた型で、等価比較や表示を自動で用意してくれます。</p>
      <pre class="code" data-code>record Person(string Name, int Age);

var p = new Person("Kanon", 20);
Console.WriteLine(p.Name);   // Kanon
Console.WriteLine(p.Age);    // 20</pre>

      <h3>そのほか</h3>
      <ul>
        <li><code>new()</code> … 型名を省略（<code>List&lt;int&gt; xs = new();</code>）</li>
        <li><code>var</code> … 型の推論</li>
        <li><code>nameof(x)</code> … 変数名を文字列として取得</li>
        <li><code>is</code> … 型の判定（<code>obj is string str</code>）</li>
      </ul>

      <h3>パターンマッチ（型の分岐）</h3>
      <pre class="code" data-code>if (obj is string str)
    Console.WriteLine(str.Length);   // string のときだけ str が使える</pre>`,
    code: `int n = 2;
string s = n switch { 1 => "one", 2 => "two", _ => "other" };

record Person(string Name, int Age);
var p = new Person("Kanon", 20);`,
    questions: [
      { q: "switch 式で「その他」を表す記号は？", options: ["_", "*", "default", "else"], answer: 0 },
      { q: "データの入れ物に向いた、モダンな型は？", options: ["record", "enum", "interface", "struct だけ"], answer: 0 },
      { q: "new List<int>() を短く書くには？", options: ["new()", "new", "create()", "[]"], answer: 0 },
      { q: "変数名を文字列として取り出すのに使うのは？", options: ["nameof(x)", "tostring(x)", "getname(x)", "str(x)"], answer: 0 },
      { q: "obj is string str のように型で分岐する仕組みを何という？", options: ["パターンマッチ", "ジェネリクス", "オーバーロード", "デリゲート"], answer: 0 },
      { type: "input", q: "switch 式で「その他（どれにも当てはまらない）」を表す1文字を入力してください", answers: ["_"], explain: "_ はワイルドカード（discard）です。" }
    ]
  }
);
