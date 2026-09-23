"""Build original, illustrative product stills for the TelForceOne case studies."""
from pathlib import Path
from html import escape

OUT = Path(__file__).resolve().parents[1] / "assets" / "cases"


def text(x, y, value, size=18, color="#20242A", weight=400, spacing=None, family="Arial, Helvetica, sans-serif"):
    extra = f' letter-spacing="{spacing}"' if spacing is not None else ""
    return f'<text x="{x}" y="{y}" fill="{color}" font-family="{family}" font-size="{size}" font-weight="{weight}"{extra}>{escape(value)}</text>'


def rect(x, y, w, h, fill, r=0, stroke=None, sw=1):
    border = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"{border}/>'


def line(x1, y1, x2, y2, color, sw=1, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<path d="M{x1} {y1}L{x2} {y2}" fill="none" stroke="{color}" stroke-width="{sw}"{d}/>'


def pill(x, y, w, label, fill="#E7EDE8", color="#47614E"):
    return rect(x, y, w, 28, fill, 14) + text(x + 13, y + 19, label, 13, color, 700)


def chrome(index, category, accent):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img">
<defs>
  <filter id="shadow" x="-20%" y="-30%" width="140%" height="160%"><feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="#000" flood-opacity=".35"/></filter>
  <clipPath id="screen"><rect x="70" y="108" width="1140" height="542" rx="10"/></clipPath>
</defs>
<rect width="1280" height="720" fill="#0B0D0F"/>
<path d="M0 75H1280M0 683H1280" stroke="#313438"/>
{text(70,52,'COSGRAL  /  CASE STUDY',16,'#E8E5DF',700,2)}
{text(1042,52,index+'  /  03',16,'#B5B3AD',400,2)}
{text(70,697,category.upper(),14,'#858884',700,2)}
{text(1010,697,'TELFORCEONE S.A.',14,'#858884',700,1)}
<g filter="url(#shadow)"><rect x="70" y="108" width="1140" height="542" rx="10" fill="#F5F5F1"/></g>
<g clip-path="url(#screen)">
{rect(70,108,1140,52,'#FCFCF9')}{line(70,160,1210,160,'#D9DBD7')}
<circle cx="92" cy="134" r="5" fill="#D9DBD7"/><circle cx="108" cy="134" r="5" fill="#D9DBD7"/><circle cx="124" cy="134" r="5" fill="#D9DBD7"/>
{rect(160,119,518,30,'#F0F1ED',6)}{text(176,140,'widok demonstracyjny / '+category.lower(),12,'#7D827E')}
<circle cx="1174" cy="134" r="13" fill="{accent}"/>{text(1169,139,'TF',10,'#FFFFFF',700)}
'''


def end():
    return '</g></svg>'


def nav(active, accent):
    s = rect(70,161,170,489,"#F0F1ED") + line(240,161,240,650,"#DADDD8")
    s += text(94,197,"TF1",24,"#20242A",700,-1) + text(94,219,"WORKSPACE",10,"#8C918D",700,1.2)
    for i,(label,y) in enumerate([("Przegląd",268),("Klienci",315),("Mapa tras",362),("Etykiety",409),("Zapasy",456),("Raporty",503)]):
        if label==active:
            s += rect(81,y-24,147,38,"#FFFFFF",6) + rect(81,y-24,3,38,accent,1)
        s += text(102,y,label,15,"#22272B" if label==active else "#838986",700 if label==active else 400)
    s += line(89,603,222,603,"#D7DAD4") + text(96,628,"ŚRODOWISKO DEMO",10,"#949A95",700,1)
    return s


def crm():
    blue="#4B6D97"
    s=chrome("01","CRM / MAPA",blue)+nav("Mapa tras",blue)
    s+=text(270,203,"Mapa klientów",27,"#242B2F",700,-.5)
    s+=text(270,228,"Plan wizyt · region południowy",14,"#808882")
    s+=pill(1054,182,122,"12 wizyt", "#E9EEF4",blue)
    s+=rect(270,254,606,350,"#E8EDE9",8)+rect(895,254,285,350,"#FFFFFF",8,"#E2E4DF")
    # Restrained cartographic streets, with a few blocks and a highlighted route.
    for d in ["M270 283C370 308 415 278 500 295S688 327 876 292", "M272 370C390 347 430 376 530 357S730 329 876 352", "M270 473C385 449 476 490 586 465S765 434 876 458", "M344 254C360 355 334 457 370 604", "M511 254C483 344 525 478 512 604", "M703 254C730 370 689 495 721 604", "M825 254C795 364 830 472 809 604"]:
        s+=f'<path d="{d}" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" opacity=".95"/>'
        s+=f'<path d="{d}" fill="none" stroke="#D2DAD4" stroke-width="1.5" opacity=".7"/>'
    s+=rect(290,272,113,31,"#FFFFFF",5)+text(302,293,"KRAKÓW",12,"#69756E",700,1)
    s+='<path d="M360 515C430 480 440 440 511 420S612 390 645 347S752 355 810 307" fill="none" stroke="#FFFFFF" stroke-width="11" stroke-linecap="round"/>'
    s+='<path d="M360 515C430 480 440 440 511 420S612 390 645 347S752 355 810 307" fill="none" stroke="#4B6D97" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 1"/>'
    for x,y,n in [(360,515,"1"),(511,420,"2"),(645,347,"3"),(810,307,"4")]:
        s+=f'<circle cx="{x}" cy="{y}" r="17" fill="#4B6D97" stroke="#FFFFFF" stroke-width="5"/>'+text(x-4,y+5,n,14,"#FFFFFF",700)
    s+=text(919,288,"DZISIAJ  /  24 WRZ",12,"#89908B",700,1.2)
    s+=text(919,326,"Trasa handlowca",19,"#242B2F",700)
    for y,time,title,sub in [(374,"09:30","Sklep K1","Kraków · centrum"),(449,"11:15","Partner 024","Wieliczka"),(524,"14:00","Punkt 018","Bochnia")]:
        s+=f'<circle cx="930" cy="{y-4}" r="5" fill="{blue}"/>'+text(947,y,time,12,blue,700)+text(947,y+23,title,16,"#2D3437",700)+text(947,y+41,sub,12,"#89908B")
    s+=text(919,581,"OTWÓRZ KARTĘ KLIENTA →",11,blue,700,1)
    return s+end()


# Code 39 wide/narrow element patterns, including start/stop. Bars and gaps alternate.
CODE39={"*":"nwnnwnwnn","T":"nnnnwwnwn","F":"nwnnwnnwn","1":"wnnwnnnnw","-":"nwnnnnwnw","2":"nnwwnnnnw","0":"nnnwwnwnn","6":"nwwnnnnnw"}


def barcode(data, x=733, y=356, unit=2.8, height=160):
    parts=[]
    cursor=x
    for char in "*"+data+"*":
        for i,c in enumerate(CODE39[char]):
            width=unit*(2.5 if c=="w" else 1)
            if i%2==0: parts.append(rect(round(cursor,2),y,round(width,2),height,"#1E2428"))
            cursor+=width
        cursor+=unit
    return ''.join(parts)


def code39():
    rust="#AD684B"
    s=chrome("02","CODE 39",rust)+nav("Etykiety",rust)
    s+=text(270,207,"Generator etykiet",27,"#242B2F",700,-.5)
    s+=text(270,233,"Przygotuj oznaczenie produktu",14,"#808882")
    s+=rect(270,268,405,328,"#FFFFFF",8,"#E1E4DF")
    s+=text(296,306,"DANE ETYKIETY",12,"#969B96",700,1.2)
    s+=text(296,347,"Kod produktu",15,"#3D4547",700)
    s+=rect(296,364,352,53,"#FCFCFA",5,"#C9CECA")
    s+=text(315,397,"TF1-2026",19,"#22272B",700,1)
    s+=text(296,451,"Standard",15,"#3D4547",700)
    s+=rect(296,466,352,48,"#F5F6F2",5,"#E1E4DF")+text(315,496,"CODE 39",15,"#394243",700)+text(615,496,"⌄",22,"#818984")
    s+=rect(296,540,352,39,rust,5)+text(363,565,"GENERUJ ETYKIETĘ ↗",14,"#FFFFFF",700,1)
    s+=rect(701,268,480,328,"#E9EAE5",8)
    s+=text(727,301,"PODGLĄD DO DRUKU",12,"#8B918C",700,1.1)
    s+=rect(725,323,430,240,"#FFFFFF",5,None)
    s+=text(747,346,"TELFORCEONE",13,"#515A5A",700,1.2)
    s+=barcode("TF1-2026",746,367,2.35,131)
    s+=text(846,528,"*TF1-2026*",18,"#25292A",700,3)
    s+=text(954,585,"ETYKIETA  01 / 01",11,"#858B85",700,1)
    return s+end()


def forecast():
    green="#617A68"
    s=chrome("03","ZAPASY / FORECAST",green)+nav("Zapasy",green)
    s+=text(270,207,"Stany i prognoza",27,"#242B2F",700,-.5)
    s+=text(270,232,"Widok planowania · 30 dni",14,"#808882")
    s+=pill(1050,183,128,"Aktualne", "#E8EEE8",green)
    for x,w,title,value,sub in [(270,280,"Stan dostępny","12 480","sztuk na stanie"),(567,280,"Rotacja","7,8 d","średni zapas"),(864,316,"Do uzupełnienia","18","indeksów")]:
        s+=rect(x,261,w,105,"#FFFFFF",7,"#E2E4DF")+text(x+18,290,title,13,"#838A84",700)+text(x+18,330,value,28,"#252C2E",700,-.5)+text(x+178,329,sub,11,"#9AA09A")
    s+=rect(270,383,600,214,"#FFFFFF",7,"#E2E4DF")+text(293,416,"Popyt i dostępność",17,"#30383A",700)
    s+=text(780,414,"30 DNI",11,"#89918B",700,1)
    for y in [456,496,536,576]: s+=line(300,y,839,y,"#E7E9E4")
    # Available stock area and forecast line.
    s+='<path d="M300 508 L354 491 L408 501 L462 480 L516 487 L570 467 L624 481 L678 458 L732 450 L786 432 L839 444 L839 576 L300 576Z" fill="#E4ECE6"/>'
    s+='<path d="M300 508 L354 491 L408 501 L462 480 L516 487 L570 467 L624 481 L678 458 L732 450 L786 432 L839 444" fill="none" stroke="#617A68" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
    s+='<path d="M300 546 L354 543 L408 534 L462 530 L516 524 L570 510 L624 507 L678 492 L732 482 L786 478 L839 470" fill="none" stroke="#B67E65" stroke-width="3" stroke-dasharray="7 6"/>'
    s+=rect(897,383,283,214,"#FFFFFF",7,"#E2E4DF")+text(920,416,"Priorytety",17,"#30383A",700)
    for y,sku,desc,status in [(456,"TF-0428","zapas na 6 dni","PILNE"),(507,"TF-1081","zapas na 9 dni","UWAGA"),(558,"TF-2204","zapas na 12 dni","OK")]:
        s+=line(919,y+11,1159,y+11,"#EBEDE9")+text(920,y,sku,15,"#343C3D",700)+text(920,y+19,desc,11,"#929A93")+text(1103,y,status,10,"#B36B50" if status!="OK" else green,700,1)
    return s+end()


if __name__ == "__main__":
    OUT.mkdir(parents=True,exist_ok=True)
    for name,build in [("crm",crm),("code39",code39),("forecast",forecast)]:
        (OUT/f"telforceone-{name}.svg").write_text(build(),encoding="utf-8")
        print(name,(OUT/f"telforceone-{name}.svg").stat().st_size)
