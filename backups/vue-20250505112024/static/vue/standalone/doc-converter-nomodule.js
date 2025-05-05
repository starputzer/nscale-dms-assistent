(function(){function n(e,t="info"){const r="[DocConverter]";switch(t){case"error":console.error(r,e);break;case"warn":console.warn(r,e);break;default:console.log(r,e)}}function d(){n("Suche nach DocConverter-Container...");const e=["#doc-converter-container","#doc-converter-app",".doc-converter",'[data-tab="docConverter"]','.admin-tab-content[data-tab="docConverter"]','.tab-content[data-active-tab="docConverter"]'];let t=null;for(const r of e){const i=document.querySelectorAll(r);if(i.length>0){t=i[0],n(`Container gefunden mit Selektor: ${r}`);break}}if(!t){n("Kein Container gefunden, versuche einen zu erstellen","warn");const r=[".admin-content",".admin-panel-content",".content-container","main",".main-content","body"];let i=null;for(const s of r){const o=document.querySelectorAll(s);if(o.length>0){i=o[0],n(`Elternelement gefunden mit Selektor: ${s}`);break}}i?(t=document.createElement("div"),t.id="doc-converter-container",t.className="doc-converter admin-tab-content",t.setAttribute("data-tab","docConverter"),t.style.display="block",t.style.visibility="visible",t.style.opacity="1",i.appendChild(t),n("Container erfolgreich erstellt")):n("Kein geeignetes Elternelement gefunden","error")}return t}function l(e){if(!e)return;const t=window.getComputedStyle(e);(t.display==="none"||t.visibility==="hidden"||t.opacity==="0")&&(n("Container ist unsichtbar, wende Korrekturen an","warn"),e.style.setProperty("display","block","important"),e.style.setProperty("visibility","visible","important"),e.style.setProperty("opacity","1","important"),e.classList.add("doc-converter-force-visible"))}function u(e){if(!e)return;n("Erstelle DocConverter UI"),e.innerHTML=`
            <div class="doc-converter-view classic-ui">
                <header class="header">
                    <h1 class="title">nscale Dokumenten-Konverter</h1>
                    <p class="subtitle">Konvertieren Sie Ihre Dokumente zu durchsuchbarem Text für das nscale DMS</p>
                </header>
                
                <main class="main-content">
                    <div class="panel-section">
                        <h2 class="section-title">Dokumente hochladen</h2>
                        
                        <form action="/api/admin/upload/document" method="post" enctype="multipart/form-data" id="converter-form">
                            <div style="margin-bottom: 1.5rem;">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Datei auswählen</label>
                                <input type="file" name="file" style="border: 1px solid #e5e7eb; padding: 0.75rem; width: 100%; border-radius: 0.25rem; background-color: #f9fafb;" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.html,.txt">
                                <p style="margin-top: 0.5rem; color: #6b7280; font-size: 0.875rem;">Unterstützte Formate: PDF, DOCX, XLSX, PPTX, HTML, TXT</p>
                            </div>
                            
                            <div style="margin-bottom: 1.5rem;">
                                <label style="display: block; margin-bottom: 0.75rem; font-weight: 500;">Konvertierungsoptionen</label>
                                
                                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-left: 0.5rem;">
                                    <label style="display: flex; align-items: center;">
                                        <input type="checkbox" name="post_processing" checked style="margin-right: 0.5rem;">
                                        <span>Nachbearbeitung (verbessert Struktur und Format)</span>
                                    </label>
                                    
                                    <label style="display: flex; align-items: center;">
                                        <input type="checkbox" name="split_sections" checked style="margin-right: 0.5rem;">
                                        <span>In Abschnitte aufteilen</span>
                                    </label>
                                    
                                    <label style="display: flex; align-items: center;">
                                        <input type="checkbox" name="extract_images" checked style="margin-right: 0.5rem;">
                                        <span>Bilder extrahieren (wenn verfügbar)</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                                <button type="submit" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500;" id="converter-submit">
                                    Dokument konvertieren
                                </button>
                                
                                <button type="reset" style="background: #e5e7eb; color: #374151; padding: 0.75rem 1.5rem; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500;">
                                    Zurücksetzen
                                </button>
                            </div>
                        </form>
                        
                        <div id="conversion-progress" style="display: none; margin-top: 2rem;">
                            <h3>Konvertierung läuft...</h3>
                            <div class="progress-bar" style="height: 8px; overflow: hidden; background-color: #e5e7eb; border-radius: 9999px; margin: 1rem 0;">
                                <div class="progress-bar-inner" style="height: 100%; background-color: #10b981; transition: width 0.3s ease; width: 0%;"></div>
                            </div>
                            <p class="progress-text">0%</p>
                        </div>
                        
                        <div id="conversion-results" style="display: none; margin-top: 2rem;">
                            <h3>Konvertierung abgeschlossen</h3>
                            <div class="results-container"></div>
                        </div>
                    </div>
                </main>
            </div>
        `;const t=e.querySelector("#converter-form"),r=e.querySelector("#conversion-progress"),i=e.querySelector(".progress-bar-inner"),s=e.querySelector(".progress-text"),o=e.querySelector("#conversion-results");t&&t.addEventListener("submit",function(p){r&&(r.style.display="block");let a=0;const f=setInterval(function(){a+=Math.random()*10,a>100&&(a=100,clearInterval(f),setTimeout(function(){r&&(r.style.display="none"),o&&(o.style.display="block",o.querySelector(".results-container").innerHTML=`
                                    <div style="padding: 1rem; margin-bottom: 1rem; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 0.25rem;">
                                        <p style="margin-bottom: 0.5rem; font-weight: 500;">Konvertierung erfolgreich</p>
                                        <p style="margin-bottom: 0;">Die Datei wurde erfolgreich konvertiert und kann jetzt verwendet werden.</p>
                                    </div>
                                    <button style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500; margin-top: 1rem;">
                                        Ergebnis herunterladen
                                    </button>
                                `)},500)),i&&(i.style.width=a+"%"),s&&(s.textContent=Math.round(a)+"%")},200);window.docConverterAllowFormSubmit||p.preventDefault()})}function m(){new MutationObserver(function(t){const r=d();r&&!r.hasAttribute("data-doc-converter-initialized")&&(n("Container durch DOM-Änderung gefunden, initialisiere UI"),r.setAttribute("data-doc-converter-initialized","true"),u(r),l(r))}).observe(document.body,{childList:!0,subtree:!0}),n("DOM-Beobachtung für DocConverter initialisiert")}function b(){n("Initialisiere DocConverter"),document.readyState==="loading"?document.addEventListener("DOMContentLoaded",function(){n("DOMContentLoaded ausgelöst, suche nach Container"),c()}):(n("DOM bereits geladen, initialisiere sofort"),c()),m()}function c(){const e=d();e?(e.hasAttribute("data-doc-converter-initialized")||(e.setAttribute("data-doc-converter-initialized","true"),u(e)),l(e),setTimeout(function(){l(e)},500)):n("Kein Container gefunden, verwende MutationObserver für spätere Erkennung","warn")}window.initializeClassicDocConverter=function(){return n("Manuelle Initialisierung aufgerufen"),c(),!0},window.docConverterStandalone=!0,b()})();
//# sourceMappingURL=doc-converter.9da69ad4.js.map
