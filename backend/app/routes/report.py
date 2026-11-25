from flask import Blueprint, request, jsonify, Response
from app.models.payroll import PayrollPeriod
from app.services.report_service import ReportService
from app.utils.decorators import token_required

report_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@report_bp.route('/salary-register/<int:period_id>', methods=['GET'])
@token_required
def get_salary_register(period_id):
    try:
        data = ReportService.get_salary_register(period_id)
        return jsonify(data), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@report_bp.route('/salary-register/<int:period_id>/csv', methods=['GET'])
@token_required
def export_salary_register_csv(period_id):
    try:
        data = ReportService.get_salary_register(period_id)
        import io, csv
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            'Emp Code', 'Full Name', 'Department', 'Designation', 'Wage Type',
            'Payable Days', 'Overtime Hrs', 'Gross Earnings', 'PF', 'ESIC',
            'PT', 'TDS', 'Advance Recovery', 'Other Deductions', 'Total Deductions',
            'Net Salary', 'Payment Status'
        ])

        for r in data['rows']:
            writer.writerow([
                r['employee_code'], r['full_name'], r['department'], r['designation'], r['wage_type'],
                r['payable_days'], r['overtime_hours'], r['gross_earnings'], r['pf_deduction'], r['esic_deduction'],
                r['pt_deduction'], r['tds_deduction'], r['advance_recovery'], r['other_deductions'], r['total_deductions'],
                r['net_salary'], r['payment_status']
            ])

        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={"Content-Disposition": f"attachment;filename=salary_register_period_{period_id}.csv"}
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@report_bp.route('/statutory/pf/<int:period_id>', methods=['GET'])
@token_required
def export_statutory_pf(period_id):
    csv_data = ReportService.export_statutory_pf_csv(period_id)
    return Response(
        csv_data,
        mimetype='text/csv',
        headers={"Content-Disposition": f"attachment;filename=epf_ecr_statement_period_{period_id}.csv"}
    )
