/**
 * Google Apps Script — Proxy pour créer des événements sur le calendrier Trébrat.
 *
 * INSTRUCTIONS DE DÉPLOIEMENT :
 * 1. Va sur https://script.google.com et crée un nouveau projet
 * 2. Colle ce code dans Code.gs
 * 3. Déploie → Nouveau déploiement → Application Web
 *    - Exécuter en tant que : Moi
 *    - Accès : Tout le monde
 * 4. Copie l'URL du déploiement
 * 5. Ajoute-la dans ton .env : VITE_GOOGLE_APPS_SCRIPT_URL=<url>
 */

var CALENDAR_ID = 'c_b90baba6f4a6b60fa843f7d6571b8b6acde9fdc906939592f53a86e33c325d77@group.calendar.google.com';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'delete') {
      return deleteEvent(data.eventId);
    }

    return createEvent(data);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function createEvent(data) {
  var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Calendrier introuvable' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var title = '🏠 ' + data.voyageur + ' (' + data.nb_personnes + ' pers.)';

  var description = 'Voyageur : ' + data.voyageur + '\n'
    + 'Personnes : ' + data.nb_personnes + '\n';

  if (data.telephone) {
    description += 'Téléphone : ' + data.telephone + '\n';
  }
  if (data.commentaires) {
    description += '\nNotes : ' + data.commentaires;
  }

  var startDate = new Date(data.date_checkin);
  var endDate = new Date(data.date_checkout);

  var event = calendar.createEvent(title, startDate, endDate, {
    description: description,
  });

  return ContentService
    .createTextOutput(JSON.stringify({ eventId: event.getId() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function deleteEvent(eventId) {
  var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Calendrier introuvable' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var event = calendar.getEventById(eventId);
    if (event) {
      event.deleteEvent();
    }
  } catch (err) {
    // Event might already be deleted
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Pour tester dans l'éditeur Apps Script
function testCreate() {
  var e = {
    postData: {
      contents: JSON.stringify({
        action: 'create',
        voyageur: 'Test Voyageur',
        date_checkin: '2026-04-01T15:00',
        date_checkout: '2026-04-05T11:00',
        nb_personnes: 4,
        telephone: '+33 6 12 34 56 78',
        commentaires: 'Test depuis Apps Script'
      })
    }
  };
  var result = doPost(e);
  Logger.log(result.getContent());
}
