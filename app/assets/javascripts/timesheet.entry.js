var TE = {};

// Days of the week indexed from 0, so we can present them to the end user.
TE.daytext = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    , 'Sunday'];

$(document).ready(function() {
  $('[rel=tooltip]').tooltip();
  $('#timesheet').validate({
    invalidHandler: function(form, validator) {
      var errors = validator.numberOfInvalids();
      if (errors) {
        $(".alert-container").html('<div class="alert alert-position alert-error" id="flash">The timesheet contains invalid time entries. They have been highlighted.</div>');
      } else {
        $(".alert-error").alert('close');
      }
    },
    errorPlacement: function(error, element) {
      element.tooltip({title: error.text(), placement: 'top', trigger: 'focus'});
    },
    highlight: function(element, errorClass, validClass) {
      $(".alert-success").alert('close')
      $($(element).parent()).addClass(errorClass).removeClass(validClass);
    },
    unhighlight: function(element, errorClass, validClass) {
      $($(element).parent()).removeClass(errorClass).addClass(validClass);
      $(element).tooltip('destroy');
    }
  });
});

TE.init = function () {
    if(task_times.length == 0) {
        TE.show_empty_timesheet_label(true);
        TE.disable_save_and_submit_buttons();
    }else {
        $.each(task_times, function(index, times_for_task){
          var task = TE.find_task(times_for_task.task_id);
          TE.generate_task_time_entry(task.proj_id, times_for_task);
        });
    }
    if($('.task', '#task_times').length > 0) { TE.refresh_totals(); }
    TE.init_project_selector();
    TE.init_form_validator();
    TE.init_approval_confirmation_dialog();
    TE.show_date_headers(true);
};

TE.init_locked_task = function(task_template) {
    task = $(task_template);
        task.find('.unlocked_controls').each(function() {
            $(this).trigger('click');
        });
        task.find('.delete=timesheet_line').each(function() {
            $(this).css('visibility','hidden');
        });
        task.find('.comment_button').each(function() {
        $(this).attr("data-locked", true);
        });
        task.find('.hours').each(function() {
            TE.disableField(this);
        });
        task.find('.minutes').each(function() {
           TE.disableField(this);
        });
};

TE.find_active_projects = function (client_id){
    return $.grep(active_projects, function (project, index) {
      return project.client_id == client_id;
    });
};

TE.find_project = function (project_id){
    return first($.grep(projects, function (project, index) {
          return project.proj_id == project_id;
        }
      )
    );
};

TE.find_tasks = function (project_id){
  return $.grep(tasks, function(task, index){
      return task.proj_id == project_id;
    }
  );
};

TE.find_task = function (task_id){
  return first($.grep(tasks, function(task, index){
      return task.task_id == task_id;
    }
  ));
};

TE.delete_task = function (task, project, project_id){
        //remove the task
        task.detach();

        //if that was the last task for a project, remove the project
        if(project.find('.task').size() == 0){
                project.detach();
        TE.remove_from_project_ids_on_timesheet(project_id);
                //if that was the last project, remove the headers and show the empty timesheet label
                if($('.project:visible').size() == 0){
                        TE.show_empty_timesheet_label(true);
                        TE.disable_submit_button();
                }
        }
        TE.refresh_totals();
};

TE.show_empty_timesheet_label = function(visible) {
        if(visible == true) {
                var empty_template = $('.empty_timesheet.template').clone().removeClass('template');
                $('#timesheet').append(empty_template);
        } else {
                $('.empty_timesheet:visible').remove();
        }
}

TE.show_date_headers = function(visible) {
  if(visible == true) {
    $(TE.daytext).each(function(i) {
      var day = TE.daytext[i];
      var element = $('#day_label_' + day.toLowerCase());
      var date_element = element.find('h6.datetext');
      date_element.text(" " + Date.parse(days[i]).toString('dd/MM'));
    });
    $('#tasks_header').css('display', 'inherit');
  } else {
    $('#tasks_header').css('display', 'none');
  }
};

TE.find_or_create_project_container = function(project_id){
    var project_container = $('.project.proj_id_'+project_id);

    if(project_container.size() == 0) {
        project_container = $('.project.template').clone().removeClass('template');
        project_container.addClass("proj_id_"+project_id);

        //set the project title
        var project = TE.find_project(project_id);
        project_container.find('.project_title').text(project.title);
        console.log(project);
        project_container.find('.project_code').text(project.proj_code);
        if(project.group_approval_required == 1){
            project_container.find('.group_approval_image').css("visibility", "visible");
        }
        $('#tasks_container').append(project_container);
    }
    return project_container;
};

TE.fill_day_template_with_values = function(day_template, day_entry){
    day_template.find('.hours').val(day_entry.hours);
    day_template.find('.minutes').val(day_entry.minutes);
    day_template.find('.comment').val(day_entry.comment);
    day_template.find('.locked').val(day_entry.locked);
};

TE.add_to_project_ids_on_timesheet = function(project_id){
    var project_ids_container = $('#project_ids_on_timesheet');
    if(project_ids_container.val() === ""){
        project_ids_container.val(project_id);
        return;
    }
    var project_ids = project_ids_container.val().split(',');
        if($.inArray(project_id, project_ids) === -1){
        project_ids.push(project_id);
        project_ids_container.val(project_ids);
    }
};

TE.remove_element_at_index = function(array, index){
    array.splice(index, 1);
    return array;
}

TE.remove_from_project_ids_on_timesheet = function(project_id){
    var project_id = "" + project_id; //convert to a string for inArray
    var project_ids_container = $('#project_ids_on_timesheet');
    var project_ids = project_ids_container.val().split(',');
    var array_index = $.inArray(project_id, project_ids);
    if(array_index > -1){
        var remaining_ids = TE.remove_element_at_index(project_ids, array_index);
        project_ids_container.val(remaining_ids);
    }
}

TE.create_submitted_template = function(){
    return $('.submitted.template').clone().removeClass('template');
}

TE.create_submitted_icon = function(){
    var submitted_template = TE.create_submitted_template();
    return submitted_template.append($('.success_icon.template').clone().removeClass('template'));
}

TE.create_unsubmitted_icon = function(){
    var submitted_template = TE.create_submitted_template();
    return submitted_template.append($('.error_icon.template').clone().removeClass('template'));
}

TE.get_select_box = function(task_template){
    return task_template.find('.task_select');
}

TE.create_option = function(task){
    var parameters = {
        val: task.task_id,
        text: task.name
    };
    var option = $('<option>', parameters);
    return option;
}

TE.create_selected_option = function(task){
    var parameters = {
        val: task.task_id,
        text: task.name,
        selected: 'selected'
    };
    var option = $('<option>', parameters);
    return option;
}

TE.add_onclick_handler = function(task_select, task_template){
    task_select.change(function() {
        TE.set_focus_to_the_first_day(task_template);
    });
}

TE.add_tasks_to_select_box_with_selected = function(project_id, task_template, selected_task_id){

    var tasks = TE.find_tasks(project_id);
    var task_select = TE.get_select_box(task_template);

    $.each(tasks, function(index, task) {

        var option = TE.create_option(task);
        if(selected_task_id == task.task_id) {
            option = TE.create_selected_option(task);
        }
        task_select.append(option);
    });
    TE.add_onclick_handler(task_select, task_template);
}

TE.add_tasks_to_select_box = function(project_id, task_template){

    var tasks = TE.find_tasks(project_id);
    var task_select = TE.get_select_box(task_template);

    $.each(tasks, function(index, task) {
        var option = TE.create_option(task);
        task_select.append(option);
    });
    TE.add_onclick_handler(task_select, task_template);
}

TE.add_delete_icon = function(project_id, task_template){
    var project_container = TE.find_or_create_project_container(project_id);
    task_template.find('.delete_timesheet_line').click(function (){
        TE.delete_task(task_template, project_container, project_id);
    });
}

TE.add_blank_day_entries = function(task_template){

}

TE.add_comment_dialog_onclick_handler = function(day_template){
    day_template.find('.comment_button').click(function () {
        TE.open_comment_dialog(day_template, $(this).attr('data-locked'));
        return false;
    });
}

TE.add_refresh_totals_on_key_up = function(task_template){
    $('.day input.hours, .day input.minutes', task_template).keyup(function () {
        TE.refresh_totals();
    });
}

TE.create_day_template = function(){
    return $('.day.template').clone().removeClass('template');
}

TE.set_dates_and_focus_handler = function(day_template, day){
    day_template.find('input').each(function(j, e) {
        e.name = e.name.replace('$date', day);
        $(e).focus(function() {
             this.select();
        });
    });
}
TE.add_empty_day_entries = function(task_template){

    $.each(days, function(i, day) {
        var day_template = TE.create_day_template();
        TE.set_dates_and_focus_handler(day_template, day);
        TE.add_comment_dialog_onclick_handler(day_template);
        task_template.find('.days').append(day_template);
        task_template.find('.days').append(day_template);
    });

    TE.add_refresh_totals_on_key_up(task_template);
}

TE.add_day_entries = function(task_template, times_for_task){

    var all_days_submitted = true;
    // the days JSON is created in the view.html.erb timesheet entry page
    $.each(days, function(i, day) {

        var day_template = TE.create_day_template();
        TE.set_dates_and_focus_handler(day_template, day);

        var day_entry = times_for_task[day];
        if(day_entry != null){
            if(all_days_submitted && day_entry.submitted === "false"){
                all_days_submitted = false;
            }
            TE.fill_day_template_with_values(day_template, day_entry);
        }

        TE.add_comment_dialog_onclick_handler(day_template);
        task_template.find('.days').append(day_template);
    });
    TE.add_refresh_totals_on_key_up(task_template);
    return all_days_submitted;
}

TE.init_project_header = function(){
    if($('.project:visible').size() == 0 ) {
        TE.show_empty_timesheet_label(false);
        TE.show_date_headers(true);
    }
}

TE.create_task_template = function(){
    return $('.task.template').clone().removeClass('template');
}

TE.generate_task_time_entry = function(project_id, times_for_task){

    TE.init_project_header();

    var task_template = TE.create_task_template();
    var project_container = TE.find_or_create_project_container(project_id);

    TE.add_tasks_to_select_box_with_selected(project_id, task_template, times_for_task.task_id);
    TE.add_delete_icon(project_id, task_template);
    var all_days_are_submitted = TE.add_day_entries(task_template, times_for_task);
    TE.add_refresh_totals_on_key_up(task_template);

    if(all_days_are_submitted){
        task_template.append(TE.create_submitted_icon());
    }else{
        task_template.append(TE.create_unsubmitted_icon());
    }
    TE.init_locked_status(task_template, times_for_task);
    project_container.append(task_template);
    TE.set_focus_to_the_first_day(task_template);  // note: the task_template must be appended to the DOM before we can set focus on the first day
    $('[rel=tooltip]').tooltip();
    return task_template;
};

TE.generate_new_task_time_entry = function(project_id){

    TE.init_project_header();

    var task_template = TE.create_task_template();
    var project_container = TE.find_or_create_project_container(project_id);

    TE.add_tasks_to_select_box(project_id, task_template);
    TE.add_empty_day_entries(task_template);
    TE.add_refresh_totals_on_key_up(task_template);
    TE.add_delete_icon(project_id, task_template);

    task_template.append(TE.create_unsubmitted_icon());
    TE.set_unlocked(task_template);
    project_container.append(task_template);
    TE.set_focus_to_the_first_day(task_template);  // note: the task_template must be appended to the DOM before we can set focus on the first day
    $('[rel=tooltip]').tooltip();
    return task_template;
};

TE.set_unlocked = function(task_template){
    var locked_status_span = task_template.find('.locked_status');
        locked_status_span.append(TE.create_unlock_control());
}


TE.init_locked_status = function(task_template, task_time){

    if(task_time.locked == true){
        var locked_status_span = task_template.find('.locked_status');
        locked_status_span.append(TE.create_locked_control());
        TE.init_locked_task(task_template);
    }else{
        TE.set_unlocked(task_template);
    }
}

TE.set_focus_to_the_first_day = function(task_template){
    task_template.find('.day:first .hours').focus();
}


/*
    refresh the row and column totals and sum total
    and display these totals in the totals elements around the grid
*/
TE.refresh_totals = function() {

        calculate_totals = function() {

            var time_data = new Array(num_rows)
            for (i=0; i <num_rows; i++) { time_data[i]=new Array(num_cols) }

            //calculate rows and put into temp storage
            $('.task:visible').each(function (row, task) {
            var row_total = 0;
            $('.day', task).each(function (col, day) {
                var hours = parseInt($('input.hours', day).val());
                var minutes = parseInt($('input.minutes', day).val());
                if(isNaN(hours)) hours = 0;
                if(isNaN(minutes)) minutes = 0;

                var total = (hours*60) + minutes;
                row_total += total;
                time_data[row][col] = total;
            });
            row_totals[row] = row_total;
            });

            //calculate cols and put into temp storage
            for(col = 0; col < num_cols; col++) {
            var col_total = 0;
            for(row = 0; row < num_rows; row++) {
                col_total += time_data[row][col];
            }
            col_totals[col] = col_total;
            grand_total += col_total;
            }
        };

    //render the row, col and grand totals to the screen
        update_totals = function(row_totals, col_totals, grand_total){

                //draw row totals
                $('.row_time_total', '#task_times').each(function (index, element) {
                        var time_as_hours_mins = TE.to_hours_mins(row_totals[index]);
                        $(element).html(time_as_hours_mins[0][0] + "h " + time_as_hours_mins[0][1] + "m");
                });

                //draw col totals
                $('.col_time_total', '#total_time').each(function (index, element) {
                        var time_as_hours_mins = TE.to_hours_mins(col_totals[index]);

                        if (time_as_hours_mins[0][0] == 0
                            && time_as_hours_mins[0][1] == 0) {
                          $(element).html('&nbsp;');
                        } else {
                          $(element).html(time_as_hours_mins[0][0] + "h " + time_as_hours_mins[0][1] + "m");
                        }
                });

                //draw grand totals
                var time_as_hours_mins = TE.to_hours_mins(grand_total);
                $('.grand_total', '#total_time').html(time_as_hours_mins[0][0] + "h " + time_as_hours_mins[0][1] + "m");

                //just incase this was hidden previously
                TE.show_totals(true);
        };

        var num_rows = $('.task:visible').size();//number of tasks
        var num_cols = 7;//7 days of the week

        //storage for totals
        var grand_total = 0;
        var row_totals = new Array(num_rows);
        var col_totals = new Array(num_cols);

        //init the arrays with zero's
        for(i=0; i<row_totals.length; i++) row_totals[i] = 0;
        for(i=0; i<col_totals.length; i++) col_totals[i] = 0;

        //if there are no tasks yet, simply skip all of this and hide the totals
        if(num_rows > 0) {
            calculate_totals();
                update_totals(row_totals, col_totals, grand_total);

        } else {
                TE.show_totals(false);
        }
};

TE.show_totals = function(show) {
        if(show) $('#total_time').show();
        else $('#total_time').hide();
};

TE.to_hours_mins = function(minutes) {
    var ret = new Array(1);
    ret[0] = new Array(2);
    ret[0][0] = Math.floor(minutes/60);
    ret[0][1] = minutes%60;
    return ret;
};

TE.open_comment_dialog = function(day_template, readonly){

    var comment = day_template.find('.comment');
    // Create a comment dialog
    var dialog_template = $('.comment_dialog.template').clone().removeClass('template');
    var dialog_config = {
        modal: true,
        width: 436,
        height: 327,
        buttons: {
            "Save": function() {
                dialog.dialog('close');
                comment.val(dialog.find('.comment').val());
            },
            "Cancel" : function() {
                dialog.dialog("close");
            }
        }
    }
    if (readonly) {
        delete dialog_config.buttons['Save'];
        dialog_template.find(".comment").attr("disabled", true);
    }

    var dialog = dialog_template.dialog(dialog_config);


    var dialog_comment = dialog.find('.comment');
    dialog_comment.val(comment.val());
    dialog_comment.select();
};

TE.project_selected = function (project_selector) {
    var project_id = project_selector.value;
    TE.add_to_project_ids_on_timesheet(project_id);
    var new_task_entry = TE.generate_new_task_time_entry(project_id);
    project_selector.value = '';
    TE.enable_save_and_submit_buttons();
    TE.refresh_totals();
};

TE.init_project_selector = function () {
    var project_selector = $('#project_selector');

    // Generate the options
    $.each(active_clients, function (i, client) {
        var client_option_group = $('<optgroup>', {label: client.organisation});
        $.each(TE.find_active_projects(client.client_id), function (j, project) {
            var option = $('<option>', {value: project.proj_id, text: project.title});
            client_option_group.append(option);
        });
        project_selector.append(client_option_group);
    });

    // Bind it to generate a new row when selected.
    project_selector.change(function(){TE.project_selected(this);});
};

TE.enable_save_and_submit_buttons = function(){
    TE.enable_button($('#save_timesheet_btn'));
    TE.enable_button($('#submit_timesheet_btn'));
};

TE.disable_submit_button = function(){
    TE.disable_button($('#submit_timesheet_btn'));
};

TE.disable_save_and_submit_buttons = function(){
    TE.disable_button($('#save_timesheet_btn'));
    TE.disable_button($('#submit_timesheet_btn'));
};

TE.enable_button = function(button) {
    button.removeAttr('disabled')
};

TE.disable_button = function(button) {
    button.attr('disabled', 'disabled');
};

TE.enable_all_days = function(task){
    task.find('.hours').each(function() {
        TE.enableField(this);
    });
    task.find('.minutes').each(function() {
        TE.enableField(this);
    });
};

TE.disable_all_days = function(task){
    task.find('.hours').each(function() {
        TE.disableField(this);
    });
    task.find('.minutes').each(function() {
        TE.disableField(this);
    });
};

TE.disableField = function(field){
    $(field).attr('readonly', true);
    $(field).css('background-color', DISABLED_BACKGROUND_GREY);
    $(field).css('color', DISABLED_FOREGROUND_GREY);
};

TE.enableField = function(field){
    $(field).attr('readonly', false);
    $(field).css('background-color', 'White');
    $(field).css('color', 'Black');
}

TE.create_unlock_control = function() {
        var control =  $('.unlocked_controls.template').clone();
        control.removeClass('template');
        control.css('display','inline-block');
    return control;
};

TE.create_locked_control = function() {
        var control =  $('.locked_controls.template').clone();
        control.removeClass('template');
        control.css('display','inline-block');
    return control;
};

TE.empty_lock_status = function(task){
    var locked_status_span = task.find('.locked_status');
    locked_status_span.empty();
    return locked_status_span;
};

TE.lock_all_days = function(task){
    day_locked_fields = task.find('.locked');
    day_locked_fields.each(function() {
        var day_locked_field = $(this);
        day_locked_field.val(true);
    });
    $('.tooltip').hide().off().removeData('popover')
    $('[rel=tooltip]').tooltip();
};

TE.unlock_all_days = function(task){
    day_locked_fields = task.find('.locked');
    day_locked_fields.each(function() {
        var day_locked_field = $(this);
        day_locked_field.val(false);
    });
    $('.tooltip').hide().off().removeData('popover')
    $('[rel=tooltip]').tooltip();
};

TE.lock_task = function(task){
    if(is_admin){
            locked_status_span = TE.empty_lock_status(task);
            locked_status_span.append(TE.create_locked_control());
            TE.lock_all_days(task);
            TE.disable_all_days(task);
        }
};

TE.unlock_task = function(task){
    if(is_admin){
            locked_status_span = TE.empty_lock_status(task);
            locked_status_span.append(TE.create_unlock_control());
            TE.unlock_all_days(task);
            TE.enable_all_days(task);
            TE.enable_save_and_submit_buttons();
    }
};

TE.init_form_validator = function () {
    $.validator.addClassRules({ 
      hours: {
        range: [0, 23]
      },
      minutes: {
        range: [0, 59]
      }
    });
    $('#timesheet').submit(TE.validate_form);
};

TE.validate_form = function () {
    var form = $('#timesheet');

    // Submitting multiple rows for the same task will cause only the last row to exist.
    // So we'll make that a validation error.

    // Check to see how often each task is used.
    var tasks_used = {};
    $('#timesheet select.task_select').each(function (index, select){
        var task_id = select.value;
        if (tasks_used[task_id] != null){
            // This task has another row in the form.
            tasks_used[task_id] = tasks_used[task_id] + 1;
        } else {
            tasks_used[task_id] = 1;
        }
    }
  );

  // Now collect the ones used more than once.
  var tasks_invalid = [];
  jQuery.each(tasks_used, function(name, value){
        if (value > 1) {
            tasks_invalid.push(name)
        }
    }
  );

  if (tasks_invalid.length > 0){
    // We have an invalid form!
    if (TE.form_validation_duplicate_task == null){
        TE.form_validation_duplicate_task = $('.form_validation_duplicate_task').clone().removeClass("template").dialog( { height: 140, modal: true } );
    }
    TE.form_validation_duplicate_task.dialog("open");
    return false;
  }
  return true;
};

TE.set_submit_for_approval_flag = function(val) {
  $('input#submit_for_approval')[0].value = val;
};

TE.get_project_title = function(project_id) {
    var number_of_projects = projects.length;
    for(var i=0;i<number_of_projects;i++){
        if(projects[i].proj_id == project_id){
            return projects[i].title;
        }
    }
}

TE.update_submit_timesheets_dialog_with_projects = function() {
    $("#approval_confirmation_dialog");

    var projects_to_submit_list = $("#project_list");
    projects_to_submit_list.empty();
    var project_ids_container = $('#project_ids_on_timesheet');
    var project_ids = [];
    if(project_ids_container.val() !== ""){

            project_ids = project_ids_container.val().split(',');

            for(var i = 0; i< project_ids.length; i++){
                var project_id = project_ids[i];
                var project_title = TE.get_project_title(project_id);
                projects_to_submit_list.append("<input type='checkbox' checked='true' value='" + project_id + "' " + " id='project_" + project_id + "'/>" +
                                                   "&nbsp;<label for='project_" + project_id + "'>" + project_title + "</label><br/>");
            }
    }
    return project_ids.length;
}


TE.init_approval_confirmation_dialog = function() {

    var SUBMIT_BUTTON_TEXT = "Submit Timesheet";

    var cancelHandler = function() {
        $("#selected_project_ids").val("");
        TE.set_submit_for_approval_flag('false');
        $("#approval_confirmation_dialog").dialog('close');
    };

    var submitHandler = function() {
        $("#approval_confirmation_dialog").dialog('close');
        var selected_project_ids = [];
        $("#approval_confirmation_dialog input[type=checkbox]:checked").each(function(index, elem) {
            selected_project_ids.push($(elem).val());
        });

        $("#selected_project_ids").val(selected_project_ids.join());
        TE.set_submit_for_approval_flag('true');
        $("form#timesheet").submit();
    };

    $("#submit_timesheet_btn").click(function() {
        var project_id_count = TE.update_submit_timesheets_dialog_with_projects();
        if(project_id_count > 0){

            var buttons = {};

            buttons["Cancel"] = function() {
                cancelHandler();
            };
            buttons[SUBMIT_BUTTON_TEXT] = function() {
                submitHandler();
            };

            $("#approval_confirmation_dialog").dialog({
              modal: true,
              autoOpen: true,
              width: 480,
              buttons: buttons
            });
        }
        var buttons = $(".ui-button");
        var submit_button = null;

        for(var i = 0;i<buttons.length;i++){
            button = buttons[i];
            if(button.textContent === SUBMIT_BUTTON_TEXT){
                button.focus();
                break;
            }
        }
        return false;
    });
};