//test if browser supports webGL
if (Modernizr.webgl) {

  const types = {
    ew: {name: '', pl: ''},
    wd: {name: 'Ward', pl: 'Wards'},
    lad: {name: 'District', pl: 'Districts'},
    "Upper Tier Local Authority": {name: 'Local Authority', pl: 'Local Authorities'},
    rgn: {name: 'Region', pl: 'Regions'},
    ctry: {name: 'Country', pl: 'Countries'}
  };

  //Load data and config file
  d3.queue()
    .defer(d3.csv, "https://raw.githubusercontent.com/theojolliffe/healthindexlads/main/csv/includedHealthAreas.csv")
    .await(ready);

  function ready(error, options) {

    options.forEach(d => {
      d.typepl = types[d.type].pl;
      d.typenm = types[d.type].name;
    });
    selected = options.find(d => d.name == 'Manchester');
    loadAreaHealth(selected.code);

    function indicatorRank(obj) {
      let indis = []
      for (let i = 0; i < subDomains.length; i++) {
          let objTemp = obj[subDomains[i].Domain].subdomains[subDomains[i].Subdomain].indicators
          let objArr = []; for (const [key, value] of Object.entries(objTemp)) {
              value['indi'] = key
              objArr.push({}); objArr[objArr.length-1] = value }
          objArr.sort(function(a, b) {
              if (subDomains[i].hlRankType=="Change1year Rank") { return b[2018].Change1year - a[2018].Change1year
              } else { return b[2018].Change3year - a[2018].Change3year }
          })
          indis.push(objArr) }
      return indis
    }

    function loadAreaHealth(code) {
      fetch("https://raw.githubusercontent.com/theojolliffe/healthindexlads/main/" + code + '.json')
      .then(res => res.json())
      .then(json => {
        quartilesHealth = null;
        place = json;
        let pos = place.priority2018.Highest.map(e => { e['pos'] = 'improvement'; e['hlRank'] = e['highestRank']; e['hlRankType'] = e['highestRankType']; return e });
        let neg = place.priority2018.Lowest.map(e => { e['pos'] = 'decline'; e['hlRank'] = e['lowestRank']; e['hlRankType'] = e['lowestRankType']; return e });
        let priorities = pos.concat(neg)
        let subDomains = priorities.filter(e => {
            return (e['Index level']=="Subdomain")
        });
        let imprDecl = []
        subDomains.sort(function(a, b) { return a.hlRank - b.hlRank })

        subDomains = subDomains.reduce((acc, current) => {
          const x = acc.find(item => item.Measure === current.Measure);
          if (!x) {
            return acc.concat([current]);
          } else {
            return acc;
          }
        }, []);
        let subImprove = subDomains.filter(e => e.pos=='improvement')
        subDomains = subDomains.filter(e => e.hlRank<11)

        let subMap = subDomains.map(e => e.pos)

        if (!subMap.includes('improvement')) {
            subDomains = subDomains.slice(0, 3)
            subDomains.push(subImprove[0])
        }

        for (const s of subDomains) {
            if (s.hlRankType == 'Rank') {
                if (s.Change3year<0) {
                    imprDecl.push('decline')
                } else {
                    imprDecl.push('improvement')
                }
            } else {
                imprDecl.push(s.pos)
            }
        }
        function indicatorRank(obj) {
          let indis = []
          for (let i = 0; i < subDomains.length; i++) {
              let objTemp = obj[subDomains[i].Domain].subdomains[subDomains[i].Subdomain].indicators
              let objArr = []; for (const [key, value] of Object.entries(objTemp)) {
                  value['indi'] = key
                  objArr.push({}); objArr[objArr.length-1] = value }
              objArr.sort(function(a, b) {
                  if (subDomains[i].hlRankType=="Change1year Rank") { return b[2018].Change1year - a[2018].Change1year
                  } else { return b[2018].Change3year - a[2018].Change3year }
              })
              indis.push(objArr) }
          return indis
        }

        let str = `
h2
  | Health in #[+value(place.name)]
  if ((place.data.Overall.total[2018].Rank>59)&(place.data.Overall.total[2018].Rank<91))
    | close to the national average
  else if (place.data.Overall.total[2018].Rank<60)
    | top
    | #[+value((place.data.Overall.total[2018].Rank)/149, {'FORMAT': '0%'})]
  else if (place.data.Overall.total[2018].Rank>90)
    | bottom
    | #[+value((Math.abs(place.data.Overall.total[2018].Rank-150))/149, {'FORMAT': '0%'})]
  | for 2018

p#subhead
    | #[+value(place.name)]'s Health Index score
    if (place.data.Overall.total[2018].Change1year<0)
      | decreased
    else
      | increased
    if (Math.abs(place.data.Overall.total[2018].Change1year)>3)
      | considerably
    else if (Math.abs(place.data.Overall.total[2018].Change1year)>1)
      | somewhat
    else
      | slightly
    | from 2017

mixin updown
    if (place.data.Overall.total[2018].Change1year > 0)
        | up
    else if (place.data.Overall.total[2018].Change1year < 0)
        | down

mixin sidDiff
    // This needs to be replaced with a calculation for significant difference when we reieve the data, -0.4 was the national ave change
    if (Math.abs(place.data.Overall.total[2018].Change1year-(-0.4))<0.3)
        |; a decline inline with the average across England.
    else if (place.data.Overall.total[2018].Change1year-(-0.4)<-0.3)
        |; a slightly greater decline than the average across England.
    else
        | .

div#co-box
  if (place.data.Overall.total[2018].value>100)
    div#callout-bigno4d
      p
        | #[+value(place.data.Overall.total[2018].value)]
  else
    div#callout-bigno3d
      p
        | #[+value(place.data.Overall.total[2018].value)]
  div#callout-text
    p
      | #[+value(place.name)]
      | has an overall health index of
      | #[+value(place.data.Overall.total[2018].value)].
      | This is determined by scores for three domains;
      | Healthy People (#[+value(place.data['Healthy People'].total[2018].value)]),
      | Healthy Lives (#[+value(place.data['Healthy Lives'].total[2018].value)]) and
      | Healthy Places (#[+value(place.data['Healthy Places'].total[2018].value)]).

div#co-box
  div#callout-bigno3d
    p
      | #[+value(place.data.Overall.total[2018].Rank)]
  div#callout-text
    p
        | In 2018, #[+value(place.name)]
        | was ranked
        | #[+value(place.data.Overall.total[2018].Rank, {'ORDINAL_NUMBER':true })]
        | healthiest out of 149 districts in England. It's index score was
        | #[+updown]
        | #[+value(Math.abs(place.data.Overall.total[2018].Change1year/100), {'FORMAT': '0.0%'})]
        | on last year
        | #[+sidDiff]

p
    | A score of 100 equates to the average across England when the index was first calculated in 2015.

mixin firstSen(i)
    | #[+value(place.name)]
    if (subDomain[i].hlRankType=="Rank")
        | has England's
        | #[+value(subDomain[i].hlRank, {'ORDINAL_TEXTUAL':true})]
        if (subDomain[i].pos=="improvement")
          if (negs.includes((subDomain[i].Measure).toLowerCase()))
            | best score for
          else
            | highest score for
        else
          if (negs.includes((subDomain[i].Measure).toLowerCase()))
            | worst score for
          else
            | lowest score for
    else
        if (subDomain[i].hlRank<11)
          | saw England’s
          if (subDomain[i].hlRank>1)
              | #[+value(subDomain[i].hlRank, {'ORDINAL_TEXTUAL':true})]
          | greatest #[+value(subDomain[i].pos)] in
        else
          | 's score for
    if (negs.includes((subDomain[i].Measure).toLowerCase()))
      | health relating to
    i #[+value((subDomain[i].Measure).toLowerCase())]
    i
    if (subDomain[i].hlRank>10)
      if (subDomain[i].pos=="improvement")
        | improved
      else
        | declined
    if (subDomain[i].hlRankType=="Change1year Rank")
        | between 2017 and 2018
    else if (subDomain[i].hlRankType=="Change3year Rank")
        | in the three years between 2015 and 2018
    | .

mixin subd(i)
    | #[+value(subDomain[i].Measure)]
    | is a subdomain of
    | #[+value(subDomain[i].Domain)]
    | which looks at
    eachz indic in Object.keys(place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].indicators) with { separator:',', last_separator:'and' }
        i #[+value(indic.toLowerCase())]
        i
    | .

mixin subd1indi(i)
  | This subdomain of
  | #[+value(subDomain[i].Domain)]
  | looks at only one indicator for
  | #[+value(subDomain[i].Measure.toLowerCase())]

mixin topBot(i, yr)
    if (place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[yr].Rank<76)
        | top
        | #[+value(place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[yr].Rank/149, {'FORMAT': '0%'})]
    else
        | bottom
        | #[+value((151-place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[yr].Rank)/149, {'FORMAT': '0%'})]

mixin secondSen(i)
    if (subDomain[i].hlRankType=="Change1year Rank")
        | From 2017 to 2018,
        | #[+value(place.name)]
        if (Math.round(100*place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2017].Rank/149)!=Math.round(100*place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2018].Rank/149))
          | went from
        else
          | remained in
        | #[+topBot(i, 2017)]
        if (Math.round(100*place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2017].Rank/149)!=Math.round(100*place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2018].Rank/149))
          | (#[+value(place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2017].value, {'FORMAT': '0.0'})])
          | to
          | #[+topBot(i, 2018)]
          | (#[+value(place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2018].value, {'FORMAT': '0.0'})])
    else
        | From 2015 to 2018,
        | #[+value(place.name)]
        if (Math.round(100*place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2015].Rank/149)!=Math.round(100*place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2018].Rank/149))
          | went from
        else
          | remained in the
        | #[+topBot(i, 2015)]
        if (Math.round(100*place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2015].Rank/149)!=Math.round(100*place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2018].Rank/149))
          | (#[+value(place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2015].value, {'FORMAT': '0.0'})])
          | to
          | #[+topBot(i, 2018)]
          | (#[+value(place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2018].value, {'FORMAT': '0.0'})])
    | for
    if (negs.includes((subDomain[i].Measure).toLowerCase()))
      | health relating to
    | #[+value(subDomain[i].Measure.toLowerCase())]
    if !(subDomain[i].hlRankType=="Rank")
        | , giving it England’s
        if (place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2018].Rank<76)
            | #[+value(place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2018].Rank, {'ORDINAL_TEXTUAL':true})]
            | highest score
        else
            | #[+value(150-place.data[subDomain[i].Domain].subdomains[subDomain[i].Measure].total[2018].Rank, {'ORDINAL_TEXTUAL':true})]
            | lowest score
    | .

mixin declineImp(i, change, index, impDec)
    if (impDec=="improvement")
        if (negs.includes((indicators[i][index].indi).toLowerCase()))
            | a decline in
            | #[+value((indicators[i][index].indi).toLowerCase())]
            | (index improved by #[+value(indicators[i][index][2018][change])])
        else
            | improvements in
            | #[+value((indicators[i][index].indi).toLowerCase())]
            | (#[+value(indicators[i][index][2018][change], {'FORMAT': '+0.0'})])
    else
        if (negs.includes((indicators[i][indicators[i].length-1-index].indi).toLowerCase()))
            | an increase in
            | #[+value((indicators[i][indicators[i].length-1-index].indi).toLowerCase())]
            | (index went down by #[+value(indicators[i][indicators[i].length-1-index][2018][change], {'FORMAT': '+0.0'})])
        else
            | a decline in
            | #[+value((indicators[i][indicators[i].length-1-index].indi).toLowerCase())]
            | (#[+value(indicators[i][indicators[i].length-1-index][2018][change], {'FORMAT': '+0.0'})])

mixin however(i, change, impDec)
    if (impDec=="improvement")
        if (indicators[i][indicators[i].length-1][2018][change]<0)
            if (negs.includes((indicators[i][indicators[i].length-1].indi).toLowerCase()))
                | , however there was also an increase in
                | #[+value((indicators[i][indicators[i].length-1].indi).toLowerCase())]
                | (index moved down #[+value(Math.abs(indicators[i][indicators[i].length-1][2018][change]))])
            else
                | , however there was a decline in
                | #[+value((indicators[i][indicators[i].length-1].indi).toLowerCase())]
                | (#[+value(indicators[i][indicators[i].length-1][2018][change], {'FORMAT': '+0.0'})])
    else
        if (indicators[i][indicators[i].length-1][2018][change]>0)
            if (negs.includes((indicators[i][indicators[i].length-1].indi).toLowerCase()))
                | , however there was an improvement in
                | #[+value((indicators[i][0].indi).toLowerCase())]
                | (#[+value(indicators[i][0][2018][change], {'FORMAT': '+0.0'})])
            else
                | , however there was an decrease in
                | #[+value((indicators[i][0].indi).toLowerCase())]
                | (#[+value(indicators[i][0][2018][change], {'FORMAT': '+0.0'})])

mixin driven(i, change, impDec)
    | #[+declineImp(i, change, 0, impDec)]
    | and
    | #[+declineImp(i, change, 1, impDec)]
    | #[+however(i, change, impDec)]
    | .

mixin lastSen(i)
    | This change was largely driven by
    if (subDomain[i].hlRankType=="Change1year Rank")
        | #[+driven(i, "Change1year", imprDecl[i])]
    else
        | #[+driven(i, "Change3year", imprDecl[i])]

mixin para(i)
  if ((subDomain[i].Measure=="Crime")|(subDomain[i].Measure=="Unemployment"))
    p #[+firstSen(i)]
    p #[+subd1indi(i)]
    p #[+secondSen(i)]
  else
    p #[+firstSen(i)]
    p #[+subd(i)]
    p #[+secondSen(i)]
    p #[+lastSen(i)]

hr
div#main-index-charts
  p < MAIN INDEX CHARTS >
hr
if (subDomain.length>0)
  p #[+para(0)]
  hr
  div#chart1
    p < CHART >
  hr
if (subDomain.length>1)
  p #[+para(1)]
  hr
  div#chart2
    p < CHART >
  hr
if (subDomain.length>2)
  p #[+para(2)]
  hr
  div#chart3
    p < CHART >
  hr
if (subDomain.length>3)
  p #[+para(3)]
  hr
  div#chart4
    p < CHART >
`
        d3.select("#myText").html(function() {
          return rosaenlg_en_US.render(str, {
            language: 'en_UK',
            place: place,
            subDomain: subDomains,
            negs: ['smoking', 'anxiety', 'alcohol misuse', 'drug misuse', 'neighbourhood noise', 'air pollution', 'depression', 'self-harm', 'suicides', 'cancer', 'kidney disease', 'cardiovascular conditions', 'crime', 'unemployment', 'low pay', 'difficulties in daily life'],
            imprDecl: imprDecl,
            indicators: indicatorRank(place.data)
          })
        });
      });
    };

    // if you push enter while in the box
    d3.select(".search-control").on("keydown", function() {
      if (d3.event.keyCode === 13) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        getCodes($(".search-control").val());
      }
    });
    //if you click on the search icon, find the postcode
    $("#submitPost").click(function(event) {

      event.preventDefault();
      event.stopPropagation();
      getCodes($(".search-control").val());
    });

    //if you focus on the search icon and push space or enter
    d3.select("#submitPost").on("keydown", function() {

      if (d3.event.keyCode === 13 || d3.event.keyCode === 32) {
        event.preventDefault();
        event.stopPropagation();
        getCodes($(".search-control").val());
      }
    });
    function getCodes(myArea) {
      console.log('myArea', myArea)
      selected = options.find(d => d.name.toLowerCase() == myArea.toLowerCase());
      loadAreaHealth(selected.code);
    };



  console.log('options', options)
  var formatValue = d3.format(",d");
  selectlist(options);

  function selectlist(datacsv) {
        var dropcodes =  datacsv.map(function(d,i) { return "id" + i; });
        var dropnames =  datacsv.map(function(d) { return d.name; });
        console.log('dropnames', dropcodes)
        var menuarea = d3.zip(dropnames,dropcodes).sort(function(a, b){ return d3.ascending(a[0], b[0]); });
        //menuarea.shift();
        //menuarea.shift();

        //clear dropdown
        d3.select("#dropdown").selectAll("*").remove()

        // Build option menu for occupations
        d3.select("#dropdown").append("div").attr("id","sel").insert("label")
        .attr("class", "visuallyhidden")
        .attr("for", "dropselect")
        .html("Inactive dropdown element, replaced by custom dropdown")

        var optns = d3.select("#dropdown").select("#sel").append("select")
          .attr("id","dropselect")
          .attr("style","width:300px")
          .attr("class","chosen-select");

        optns.append("option")
          // .attr("value","first")
          // .text("");
        optns.selectAll("p").data(menuarea).enter().append("option")
          .attr("value", function(d){return d[1]})
          .attr("id",function(d){return d[1]})
          .text(function(d){ return d[0]});

        myId=null;

        $('#dropselect').chosen({width: "98%", allow_single_deselect:true})

        d3.select('input.chosen-search-input').attr('id','chosensearchinput')
        d3.select('div.chosen-search').insert('label','input.chosen-search-input')
            .attr('class','visuallyhidden')
            .attr('for','chosensearchinput')
            .html("Type to select an area")


        $('#dropselect').on('change',function(evt,params){

            if($('#dropselect').val() != "") {
            //if(typeof params != 'undefined') {
              clicked = true;
                d3.selectAll(".cell").classed("cellsselected", false);
                d3.selectAll(".cells path").style("pointer-events","none")

                dropcode = $('#dropselect').val();

                dropcodeid = +dropcode.substr(2)


                d3.select(".cell" + dropcodeid).classed("cellsselected", true);
                datafilter = datacsv.filter(function(d,i) {return "id" + i == dropcode})

                getCodes(datafilter[0].name)

                d3.select('abbr').on('keypress',function(evt){
                  if(d3.event.keyCode==13 || d3.event.keyCode==32){
                    d3.event.preventDefault()

                    clicked = false;

                    d3.select(".cell" + dropcodeid).classed("cellsselected",false)
                    d3.selectAll(".cells path").style("pointer-events","all")

                    d3.select("#info").html("");

                    $("#dropselect").val(null).trigger('chosen:updated');
                  }
                })

            }
            else {
              clicked = false;

              d3.selectAll(".cell").classed("cellsselected", false);
              d3.selectAll(".cells path").style("pointer-events","all");

              d3.select("#info").html("");

            }
        });
      } //end selectlist

  };
}
