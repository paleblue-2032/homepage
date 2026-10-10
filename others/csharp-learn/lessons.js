// レッスンデータ。本文は HTML、コードは文字列、quiz は選択式。
// code 内の C# 文字列補間 ( $"{x}" ) は JS テンプレートリテラルと衝突するため \${ とエスケープしている。
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
      </ul>
      <p class="note">この教材は「読んで、予想して、答える」形式です。実際に手を動かすのは最後の総復習で。</p>`,
    code: `// これが C# のコード
Console.WriteLine("Hello, C#!");`,
    questions: [
      {
        q: "C# のコードは、実行される前にどうなる？",
        options: ["そのまま1行ずつ実行される", "コンパイルされて機械が扱える形になる", "HTML に変換される", "自動で Python になる"],
        answer: 1,
        explain: "C# はコンパイル言語。書いたコードは .NET が扱える形に変換されてから実行されます。"
      },
      {
        q: "C# が使われている例として近いのは？",
        options: ["Unity のゲーム開発", "HTML のタグ", "Photoshop のフィルタ専用", "Excel の数式"],
        answer: 0,
        explain: "Unity のゲームスクリプトは C#。ほかにも Web や業務系で広く使われます。"
      }
    ]
  },

  {
    id: "hello",
    section: "はじめの一歩",
    title: "最初のプログラム",
    body: `
      <p>実行の入口が <code>Main</code> メソッドです。ここから上から順に処理が進みます。<code>Console.WriteLine</code> は「1行表示して改行」します。</p>
      <p class="note">表示のたびに勝手に改行されるので、続けて書くと行が分かれます。</p>`,
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
      {
        q: "このプログラムを実行すると、どう表示される？",
        options: ["Hello, C#! と 3 が2行で出る", "Hello, C#! と 1 + 2 が2行で出る", "エラーになる", "何も表示されない"],
        answer: 0,
        explain: "1 + 2 は計算されて 3 になります。WriteLine は値を評価してから表示します。"
      },
      {
        q: "Console.WriteLine がしていることは？",
        options: ["文字や値を画面に1行表示する", "キーボード入力を待つ", "ファイルに保存する", "変数を消す"],
        answer: 0
      }
    ]
  },

  {
    id: "vars",
    section: "値と型",
    title: "変数と型",
    body: `
      <p>値を入れておく箱が<strong>変数</strong>で、箱の種類が<strong>型</strong>です。代表的なのはこの4つ。</p>
      <ul>
        <li><code>int</code> 整数 / <code>double</code> 小数 / <code>string</code> 文字列 / <code>bool</code> true・false</li>
        <li><code>var</code> は右辺から型を<strong>推論</strong>してくれる（型を書かなくていいだけ）</li>
      </ul>`,
    code: `int age = 20;
double pi = 3.14;
string name = "Kanon";
bool ok = true;

var n = 10;        // 整数なので int と推論される
age = age + 1;     // 21`,
    questions: [
      {
        q: "var n = 10; のとき、n の型は？",
        options: ["int", "double", "string", "var という型"],
        answer: 0,
        explain: "var は右辺から型を推論します。10 は整数リテラルなので int になります。"
      },
      {
        q: "string name = ...; に代入できないのは？",
        options: ["42", "\"abc\"", "\"こんにちは\"", "\"\""],
        answer: 0,
        explain: "string は文字列の型。42 は int なのでそのままでは代入できません。"
      }
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
      {
        q: "int x = 2; のとき、Console.WriteLine($\"xは{x}です\"); の表示は？",
        code: `int x = 2;
Console.WriteLine($"xは{x}です");`,
        options: ["xは2です", "xは{x}です", "xはxです", "エラーになる"],
        answer: 0,
        explain: "{ } の中は式として評価され、値が埋め込まれます。"
      },
      {
        q: "name.Length が表すものは？",
        options: ["文字数", "文字列の中身", "改行コード", "型の名前"],
        answer: 0
      }
    ]
  },

  {
    id: "numbers",
    section: "値と型",
    title: "計算と演算子",
    body: `
      <p><code>+ - * / %</code> が使えます。<strong>整数同士の割り算は整数</strong>になり、小数点以下は切り捨てられる点が要注意。</p>
      <ul>
        <li><code>%</code> は割った余り</li>
        <li>小数にしたいときは片方を <code>7.0</code> のように書く</li>
      </ul>`,
    code: `Console.WriteLine(7 + 3);   // 10
Console.WriteLine(7 / 2);   // 3   ← 整数の割り算！
Console.WriteLine(7 % 2);   // 1
Console.WriteLine(7.0 / 2); // 3.5

int c = 0;
c++;                        // 1 増える`,
    questions: [
      {
        q: "Console.WriteLine(7 / 2); の結果は？",
        options: ["3", "3.5", "4", "エラーになる"],
        answer: 0,
        explain: "int 同士の割り算は整数。小数点以下は切り捨てられます。"
      },
      {
        q: "Console.WriteLine(10 % 3); の結果は？",
        options: ["1", "3", "3.33", "0"],
        answer: 0,
        explain: "% は余り。10 を 3 で割った余りは 1 です。"
      }
    ]
  },

  {
    id: "if",
    section: "制御",
    title: "条件分岐 if / else",
    body: `
      <p>条件が成り立つときだけ処理を実行します。比較は <code>&gt; &gt;= &lt; &lt;= == !=</code>。</p>
      <ul>
        <li><code>&amp;&amp;</code> かつ（AND） / <code>||</code> または（OR） / <code>!</code> 否定</li>
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
      {
        q: "score = 75 のとき、表示されるのは？",
        options: ["良", "優", "不可", "何も表示されない"],
        answer: 0,
        explain: "80 以上ではないので次の条件へ。60 以上なので「良」が実行されます。"
      },
      {
        q: "「a かつ b」を表す書き方は？",
        options: ["a && b", "a || b", "a !b", "a and b"],
        answer: 0,
        explain: "&& が AND、|| が OR、! が NOT です。"
      }
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
      {
        q: "cmd = \"stop\" のとき、表示されるのは？",
        options: ["停止", "開始", "不明", "エラーになる"],
        answer: 0
      },
      {
        q: "case の最後に break; を書くのを忘れると？",
        options: ["次の case の処理まで流れ込む", "必ずエラーになる", "何も起きない", "default が消える"],
        answer: 0
      }
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
      {
        q: "for (int i = 0; i < 3; i++) で表示される数字を順に並べると？",
        options: ["0 1 2", "1 2 3", "0 1 2 3", "1 2"],
        answer: 0,
        explain: "i は 0 から始まり、i < 3 の間だけ回るので 0,1,2 の3回です。"
      },
      {
        q: "while (n > 0) で n = 3 のとき、表示されるのは？",
        options: ["3 2 1", "1 2 3", "3 2 1 0", "無限ループになる"],
        answer: 0,
        explain: "n-- で減らしていき、n が 0 になった時点で条件が false になります。"
      }
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
      {
        q: "int[] nums = { 10, 20, 30 }; のとき、nums[0] は？",
        options: ["10", "20", "30", "エラーになる"],
        answer: 0,
        explain: "添字は 0 から始まるので、最初の要素は nums[0] です。"
      },
      {
        q: "配列と List の違いは？",
        options: ["List は要素を追加・削除できる", "配列は個数を後から増やせる", "List の方が必ず速い", "違いはない"],
        answer: 0
      }
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

// 呼び出し
int r = Add(2, 3);   // 5
Greet("Kanon");      // Hi Kanon`,
    questions: [
      {
        q: "Add(2, 3) の戻り値は？",
        options: ["5", "23", "2", "エラーになる"],
        answer: 0
      },
      {
        q: "戻り値の型に void と書くと、どういう意味？",
        options: ["戻り値がない", "引数がない", "必ず 0 を返す", "非公開という意味"],
        answer: 0
      }
    ]
  },

  {
    id: "classes",
    section: "オブジェクト指向",
    title: "クラスとオブジェクト",
    body: `
      <p>データと処理をひとまとめにした設計図が<strong>クラス</strong>、そこから作った実体が<strong>オブジェクト</strong>です。<code>new</code> で作ります。</p>
      <p>クラスの中で定義した変数を<strong>フィールド</strong>、処理を<strong>メソッド</strong>と呼びます。</p>`,
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
      {
        q: "new Dog() がしていることは？",
        options: ["Dog のオブジェクトを作る", "Dog を削除する", "Name を必ず初期化する", "Bark を定義する"],
        answer: 0
      },
      {
        q: "d.Bark() で表示されるのは？",
        options: ["ポチ: ワン!", "Name: ワン!", "ワン!", "エラーになる"],
        answer: 0,
        explain: "{Name} には d の Name（\"ポチ\"）が入ります。"
      }
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
      {
        q: "public int Value { get; private set; } のとき、外から Value に代入できる？",
        options: ["できない", "できる", "読み取りもできない", "文字列を入れられる"],
        answer: 0,
        explain: "private set; なので setter はクラスの中からのみ。外からは読み取り専用です。"
      },
      {
        q: "c.Inc() を2回呼んだ後の c.Value は？",
        options: ["2", "1", "0", "エラーになる"],
        answer: 0
      }
    ]
  },

  {
    id: "linq",
    section: "一歩先",
    title: "LINQ でコレクション操作",
    body: `
      <p>リストなどに対して「絞り込み・変換・集計」をメソッドチェーンで書けます。</p>
      <ul>
        <li><code>Where</code> 条件に合うものだけ残す</li>
        <li><code>Select</code> それぞれを変換する</li>
        <li><code>Count</code> 個数を数える</li>
      </ul>
      <p class="note"><code>n =&gt; n % 2 == 0</code> は「n を受け取って偶数かどうかを返す」小さな関数です。</p>`,
    code: `var nums = new List<int> { 1, 2, 3, 4, 5, 6 };

var evens   = nums.Where(n => n % 2 == 0);  // 2, 4, 6
var doubled = nums.Select(n => n * 2);      // 2, 4, 6, 8, 10, 12

Console.WriteLine(nums.Count(n => n > 3)); // 3`,
    questions: [
      {
        q: "nums.Where(n => n % 2 == 0) が残すのは？",
        options: ["偶数だけ", "奇数だけ", "すべて", "何も残らない"],
        answer: 0
      },
      {
        q: "nums.Count(n => n > 3) の結果は？",
        options: ["3", "4", "6", "0"],
        answer: 0,
        explain: "3 より大きいのは 4, 5, 6 の3つです。"
      }
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
      {
        q: "int.Parse(\"abc\") を try/catch なしで実行すると？",
        options: ["例外で処理が止まる", "0 になる", "null になる", "自動で直る"],
        answer: 0
      },
      {
        q: "このコードの表示は？",
        options: ["数値じゃなかった", "abc", "0", "何も表示されない"],
        answer: 0
      }
    ]
  }
];
